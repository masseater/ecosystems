import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import semver from "semver";

import { baseName, baseRevision } from "#/shared/lib/base-revision.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "unbumped-package";
const MANIFEST = /(?:^|\/)package\.json$/u;
const UNSHIPPED =
  /(?:\.test\.[\w.]+$|(?:^|\/)(?:fixtures|__tests__|tests?)\/|(?:^|\/)(?:AGENTS|CLAUDE|CHANGELOG)\.md$)/u;
const UNVERSIONED = "0.0.0";
const SEPARATOR = "/";
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const READ_CONCURRENCY = 16;

const Manifest = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.String,
    version: Schema.String,
    private: Schema.optional(Schema.Boolean),
  }),
);

interface Package {
  readonly file: string;
  readonly directory: string;
  readonly name: string;
  readonly version: string;
  readonly text: string;
}

const directoryOf = (file: string): string => Str.slice(0, file.lastIndexOf(SEPARATOR) + 1)(file);

const decodeManifest = Schema.decodeUnknownOption(Manifest);

const packageAt = (file: string, text: string): Option.Option<Package> =>
  pipe(
    decodeManifest(text),
    Option.filter(({ private: hidden, version }) => hidden !== true && version !== UNVERSIONED),
    Option.map(({ name, version }): Package => ({
      file,
      directory: directoryOf(file),
      name,
      version,
      text,
    })),
  );

const versionAt = (name: string, text: Option.Option<string>): Option.Option<string> =>
  pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.filter((manifest) => manifest.name === name),
    Option.map(({ version }) => version),
    Option.filter((version) => semver.valid(version) !== null),
  );

const versionLine = (text: string): number =>
  pipe(
    Str.split(text, "\n"),
    Arr.findFirstIndex((line) => Str.includes('"version"')(line)),
    Option.match({ onNone: () => FIRST_LINE, onSome: (index) => index + FIRST_LINE }),
  );

const shippedChange = (directory: string, changed: readonly string[]): boolean =>
  pipe(
    changed,
    Arr.some((name) => Str.startsWith(directory)(name) && !UNSHIPPED.test(name)),
  );

const floorOf = (versions: readonly Option.Option<string>[]): Option.Option<string> =>
  pipe(Arr.getSomes(versions), Arr.sort(semver.compare), Arr.last);

const message = ({ name, version }: Package, floor: string): string =>
  `${name} changed, but its version ${version} is not above ${floor}, the version of the base or of main. Another change may already publish ${floor}. Bump the version above ${floor}.`;

/** @internal */
export const checkPackageVersions = Effect.fn("checkPackageVersions")(
  function* checkPackageVersions(root: string) {
    const files = yield* RepositoryFiles;
    const base = yield* baseRevision(root);
    if (Option.isNone(base)) {
      return [];
    }
    const tip = yield* baseName;
    const changed = yield* files.changedFiles(root, base.value);
    const listed = yield* files.listedFiles(root);
    const packages = yield* Effect.forEach(
      Arr.filter(listed, (name) => MANIFEST.test(name)),
      (name) =>
        Effect.map(files.readFile(files.join(root, name)), (text) =>
          Option.flatMap(text, (found) => packageAt(name, found)),
        ),
      { concurrency: READ_CONCURRENCY },
    );
    const found = yield* Effect.forEach(
      pipe(
        Arr.getSomes(packages),
        Arr.filter(({ directory }) => shippedChange(directory, changed)),
      ),
      (pack) =>
        Effect.gen(function* compare() {
          const before = yield* files.readAtRevision(root, base.value, pack.file);
          const claimed = yield* files.readAtRevision(root, tip, pack.file);
          const floor = floorOf([versionAt(pack.name, before), versionAt(pack.name, claimed)]);
          return pipe(
            floor,
            Option.filter((lowest) => !semver.gt(pack.version, lowest)),
            Option.map((lowest): Problem => ({
              file: files.join(root, pack.file),
              line: versionLine(pack.text),
              column: FIRST_COLUMN,
              rule: RULE,
              message: message(pack, lowest),
            })),
            Option.toArray,
          );
        }),
      { concurrency: READ_CONCURRENCY },
    );
    return Arr.flatten(found);
  },
);
