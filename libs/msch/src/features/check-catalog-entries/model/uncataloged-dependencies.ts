import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "uncataloged-dependency";
const SECTIONS = ["dependencies", "devDependencies", "optionalDependencies"] as const;
const OWNED_ELSEWHERE: readonly string[] = ["catalog:", "workspace:", "link:", "file:"];
const ROOT_DIRECTORY = ".";
const START = 0;
const MESSAGE =
  "is a version written in this package.json. Add it to the catalog in pnpm-workspace.yaml and write `catalog:` here, so that one entry owns the version and every package that uses the dependency moves together.";

type Fields = Readonly<Record<string, unknown>>;

const FieldsSchema = Schema.Record(Schema.String, Schema.Unknown);
const decodeFields = Schema.decodeUnknownOption(FieldsSchema);
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(FieldsSchema));
const decodeString = Schema.decodeUnknownOption(Schema.String);

const fieldsOf = (value: unknown): Fields => Option.getOrElse(decodeFields(value), () => ({}));

const quoted = (text: string): string =>
  Str.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)(text);

interface Specified {
  readonly name: string;
  readonly specifier: string;
}

const specifiedIn = (held: unknown): readonly Specified[] =>
  pipe(
    fieldsOf(held),
    Rec.toEntries,
    Arr.flatMap(([name, value]) =>
      pipe(
        decodeString(value),
        Option.map((specifier) => ({ name, specifier })),
        Option.toArray,
      ),
    ),
  );

const isOwnedElsewhere = ({ specifier }: Specified): boolean =>
  pipe(
    OWNED_ELSEWHERE,
    Arr.some((protocol) => Str.startsWith(protocol)(specifier)),
  );

const patternOf = ({ name, specifier }: Specified): RegExp =>
  new RegExp(`"${quoted(name)}"\\s*:\\s*"${quoted(specifier)}"`, "u");

const offsetOf = (source: string, found: Specified): number =>
  pipe(
    Option.fromNullishOr(patternOf(found).exec(source)),
    Option.map(({ index }) => index),
    Option.getOrElse(() => START),
  );

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    decodeManifest(source),
    Option.map((manifest) =>
      pipe(
        SECTIONS,
        Arr.flatMap((section) => specifiedIn(manifest[section])),
        Arr.filter((found) => !isOwnedElsewhere(found)),
        Arr.map((found): Problem => ({
          file: entry.file,
          ...positionOf(source)(offsetOf(source, found)),
          rule: RULE,
          message: `\`${found.name}\` \`${found.specifier}\` ${MESSAGE}`,
        })),
      ),
    ),
    Option.getOrElse((): readonly Problem[] => []),
  );

/** @internal */
export const uncatalogedDependencies = Effect.fn("uncatalogedDependencies")(
  function* uncatalogedDependencies(root: string) {
    const files = yield* RepositoryFiles;
    const directories = yield* workspaceDirectories(root);
    const listed = pipe(
      [ROOT_DIRECTORY, ...directories],
      Arr.map((directory): Listed => {
        const name = files.join(directory, MANIFEST_FILE);
        return { name, file: files.join(root, name) };
      }),
    );
    return yield* scanText(listed, problemsIn);
  },
);
