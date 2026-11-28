import {
  Array as Arr,
  Effect,
  HashMap,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClientResponse } from "effect/http";
import type { HttpClient } from "effect/http";
import semver from "semver";

import {
  decodeManifest,
  fieldsOf,
  namedCatalogsOf,
  specifiedIn,
} from "#/entities/package/index.ts";
import type { Specified } from "#/entities/package/index.ts";
import { workspaceManifest } from "#/entities/workspace/index.ts";
import { baseName } from "#/shared/lib/base-revision.ts";
import { publicLookup, sent } from "#/shared/lib/lookup.ts";
import { manifestTexts } from "#/shared/lib/manifest-texts.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const REGISTRY = "https://registry.npmjs.org/";
const ABBREVIATED = "application/vnd.npm.install-v1+json";
const OWN_SCOPE = /^@(?:r_masseater|masseater\.dev)\//u;
const WORKSPACE_PROTOCOL = "workspace:";
const CATALOG_PROTOCOL = "catalog:";
const DEFAULT_CATALOG = "default";
const UNVERSIONED = "0.0.0";
const FIRST_LINE = 1;
const READ_CONCURRENCY = 16;
const LOOKUP_CONCURRENCY = 4;
const SECTIONS = ["dependencies", "optionalDependencies"] as const;

/** @internal */
export interface MissingVersion {
  readonly file: string;
  readonly line: number;
  readonly dependency: string;
  readonly reason: string;
}

const Packument = Schema.Struct({ versions: Schema.Record(Schema.String, Schema.Unknown) });

interface Package {
  readonly file: string;
  readonly name: string;
  readonly version: string;
  readonly text: string;
  readonly specified: readonly Specified[];
}

const stringOf = (value: unknown): Option.Option<string> =>
  Option.liftPredicate(value, (found): found is string => typeof found === "string");

const packageAt = (file: string, text: string): Option.Option<Package> =>
  pipe(
    decodeManifest(text),
    Option.filter((fields) => fields["private"] !== true),
    Option.flatMap((fields) =>
      Option.all({ name: stringOf(fields["name"]), version: stringOf(fields["version"]) }).pipe(
        Option.filter(({ version }) => version !== UNVERSIONED),
        Option.map(({ name, version }): Package => ({
          file,
          name,
          version,
          text,
          specified: pipe(
            SECTIONS,
            Arr.flatMap((section) => specifiedIn(fieldsOf(fields)[section])),
          ),
        })),
      ),
    ),
  );

const OK = 200;
const NOT_FOUND = 404;

type Versions = Effect.Effect<Option.Option<readonly string[]>, unknown>;

const versionsIn = (response: HttpClientResponse.HttpClientResponse): Versions => {
  if (response.status === OK) {
    return HttpClientResponse.schemaBodyJson(Packument)(response).pipe(
      Effect.map(({ versions }) => Option.some(Rec.keys(versions))),
    );
  }
  if (response.status === NOT_FOUND) {
    return Effect.succeed(Option.some<readonly string[]>([]));
  }
  return Effect.succeed(Option.none());
};

const publishedVersions = (
  name: string,
): Effect.Effect<Option.Option<readonly string[]>, never, HttpClient.HttpClient> =>
  sent({
    ...publicLookup(`${REGISTRY}${Str.replace("/", "%2f")(name)}`),
    accept: ABBREVIATED,
  }).pipe(
    Effect.flatMap(versionsIn),
    Effect.orElseSucceed(() => Option.none<readonly string[]>()),
  );

const catalogRanges = (
  settings: Option.Option<Readonly<Record<string, unknown>>>,
): HashMap.HashMap<string, string> =>
  pipe(
    settings,
    Option.map((found) => [
      ...specifiedIn(found["catalog"]).map(({ name, specifier }) => [name, specifier] as const),
      ...pipe(
        namedCatalogsOf(found),
        Arr.flatMap(([, held]) => specifiedIn(held)),
        Arr.map(({ name, specifier }) => [name, specifier] as const),
      ),
    ]),
    Option.getOrElse((): readonly (readonly [string, string])[] => []),
    HashMap.fromIterable,
  );

const lineOf = (text: string, dependency: string): number =>
  pipe(
    Str.split(text, "\n"),
    Arr.findFirstIndex((line) => Str.includes(`"${dependency}"`)(line)),
    Option.match({ onNone: () => FIRST_LINE, onSome: (index) => index + FIRST_LINE }),
  );

interface Wanted {
  readonly owner: Package;
  readonly name: string;
  readonly range: string;
  readonly sibling: Option.Option<Package>;
}

const rangeOf = (
  catalog: HashMap.HashMap<string, string>,
  { name, specifier }: Specified,
): Option.Option<string> => {
  if (Str.startsWith(CATALOG_PROTOCOL)(specifier)) {
    return HashMap.get(catalog, name);
  }
  return Option.some(specifier);
};

const siblingWanted =
  (siblings: HashMap.HashMap<string, Package>, owner: Package) =>
  ({ name }: Specified): readonly Wanted[] =>
    pipe(
      HashMap.get(siblings, name),
      Option.map((sibling): Wanted => ({
        owner,
        name,
        range: sibling.version,
        sibling: Option.some(sibling),
      })),
      Option.toArray,
    );

const registryWanted =
  (catalog: HashMap.HashMap<string, string>, owner: Package) =>
  (specified: Specified): readonly Wanted[] =>
    pipe(
      Option.liftPredicate(specified, ({ name }) => OWN_SCOPE.test(name)),
      Option.flatMap((own) => rangeOf(catalog, own)),
      Option.map((range): Wanted => ({
        owner,
        name: specified.name,
        range,
        sibling: Option.none(),
      })),
      Option.toArray,
    );

const wantedBy =
  (siblings: HashMap.HashMap<string, Package>, catalog: HashMap.HashMap<string, string>) =>
  (owner: Package): readonly Wanted[] =>
    pipe(
      owner.specified,
      Arr.flatMap((specified) => {
        if (Str.startsWith(WORKSPACE_PROTOCOL)(specified.specifier)) {
          return siblingWanted(siblings, owner)(specified);
        }
        return registryWanted(catalog, owner)(specified);
      }),
    );

/** @internal */
export const missingVersions = Effect.fn("missingVersions")(function* missingVersions(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const tip = yield* baseName;
  const manifests = yield* manifestTexts(root);
  const read = Arr.map(manifests, ({ file, text }) => packageAt(file, text));
  const packages = Arr.getSomes(read);
  const siblings = HashMap.fromIterable(
    pipe(
      packages,
      Arr.map((found) => [found.name, found] as const),
    ),
  );
  const settings = yield* workspaceManifest(root);
  const catalog = catalogRanges(
    Option.map(settings, (found): Readonly<Record<string, unknown>> => ({ ...found })),
  );
  const wanted = pipe(packages, Arr.flatMap(wantedBy(siblings, catalog)));
  const unchanged = yield* Effect.filter(
    wanted,
    ({ sibling }) =>
      Option.match(sibling, {
        onNone: () => Effect.succeed(true),
        onSome: (found) =>
          files.readAtRevision(root, tip, found.file).pipe(
            Effect.map((before) =>
              pipe(
                before,
                Option.flatMap(decodeManifest),
                Option.flatMap((fields) => stringOf(fields["version"])),
                Option.contains(found.version),
              ),
            ),
          ),
      }),
    { concurrency: READ_CONCURRENCY },
  );
  const names = pipe(
    unchanged,
    Arr.map(({ name }) => name),
    Arr.dedupe,
  );
  const versions = yield* Effect.forEach(
    names,
    (name) => Effect.map(publishedVersions(name), (found) => [name, found] as const),
    { concurrency: LOOKUP_CONCURRENCY },
  );
  const known = HashMap.fromIterable(versions);
  return pipe(
    unchanged,
    Arr.flatMap(({ owner, name, range }) =>
      pipe(
        HashMap.get(known, name),
        Option.flatten,
        Option.filter((published) => semver.maxSatisfying([...published], range) === null),
        Option.map((): MissingVersion => ({
          file: owner.file,
          line: lineOf(owner.text, name),
          dependency: `${name}@${range}`,
          reason: "is not on npm. Publish it first, or lower the range to a version that is.",
        })),
        Option.toArray,
      ),
    ),
  );
});
