import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "pack-publint";
const PREPUBLISH_RULE: RuleName = "prepublish-script";
const PREPUBLISH_SCRIPT = "prepublishOnly";
const PREPUBLISH_COMMAND = "vp exec msch-publish prepublish .";
const CONFIG_FILE = "vite.config.ts";
const PACK_KEY = "pack:";
const START = 0;
const READ_CONCURRENCY = 16;
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const Manifest = Schema.Struct({
  private: Schema.optional(Schema.Boolean),
  publishConfig: Schema.optional(Schema.Unknown),
  scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

const StrictPack = Schema.Struct({ publint: Schema.Struct({ strict: Schema.Literal(true) }) });
const isStrict = Schema.is(StrictPack);
const PackConfig = Schema.Struct({ pack: Schema.optional(Schema.Unknown) });
const decodePackConfig = Schema.decodeUnknownOption(PackConfig);

const taggedError = Schema.TaggedError;

class PackConfigUnreadable extends taggedError<
  PackConfigUnreadable,
  { readonly brand: unique symbol }
>()("PackConfigUnreadable", { file: Schema.String }) {}

const isPublished = (manifest: typeof Manifest.Type): boolean =>
  manifest.private !== true && Predicate.isNotUndefined(manifest.publishConfig);

const runsStrictPublint = (config: unknown): boolean =>
  pipe(
    decodePackConfig(config),
    Option.flatMap(({ pack }) => Option.fromUndefinedOr(pack)),
    Option.map((pack): readonly unknown[] => Arr.ensure(pack)),
    Option.exists(Arr.some(isStrict)),
  );

const problemFor = (file: string, source: string): Problem => ({
  file,
  ...positionOf(source)(Option.getOrElse(Str.indexOf(PACK_KEY)(source), () => START)),
  rule: RULE,
  message:
    "This package is published, so its pack must run publint with `publint: { strict: true }`. Without it, publishConfig can point at files vp pack never writes, and the published package fails to import.",
});

const publishedManifest = (source: Option.Option<string>): Option.Option<typeof Manifest.Type> =>
  pipe(source, Option.flatMap(decodeManifest), Option.filter(isPublished));

const prepublishProblems = (
  file: string,
  source: string,
  manifest: typeof Manifest.Type,
): readonly Problem[] => {
  const declared = pipe(
    Option.fromUndefinedOr(manifest.scripts),
    Option.flatMap(Rec.get(PREPUBLISH_SCRIPT)),
  );
  if (Option.contains(declared, PREPUBLISH_COMMAND)) {
    return [];
  }
  return [
    {
      file,
      ...positionOf(source)(
        Option.getOrElse(Str.indexOf(`"${PREPUBLISH_SCRIPT}"`)(source), () => START),
      ),
      rule: PREPUBLISH_RULE,
      message: `This package is published, so its ${PREPUBLISH_SCRIPT} script must be exactly \`${PREPUBLISH_COMMAND}\`. That one command refuses npm publish, which leaves catalog: in dependencies, and builds the package. Writing the guard in each package leaves some packages without it.`,
    },
  ];
};

const strictPublintIn = Effect.fn("strictPublintIn")(function* strictPublintIn(configFile: string) {
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(configFile),
    catch: () => PackConfigUnreadable.make({ file: configFile }),
  }).pipe(Effect.option);
  return Option.exists(config, runsStrictPublint);
});

const configProblems = Effect.fn("configProblems")(function* configProblems(configFile: string) {
  const files = yield* RepositoryFiles;
  const source = yield* files.readFile(configFile);
  if (Option.isNone(source)) {
    return [];
  }
  const strict = yield* strictPublintIn(configFile);
  if (strict) {
    return [];
  }
  return [problemFor(configFile, source.value)];
});

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(
  root: string,
  manifestName: string,
) {
  const files = yield* RepositoryFiles;
  const manifestFile = files.join(root, manifestName);
  const source = yield* files.readFile(manifestFile);
  const manifest = publishedManifest(source);
  if (Option.isNone(manifest) || Option.isNone(source)) {
    return [];
  }
  const config = yield* configProblems(files.join(root, files.dirname(manifestName), CONFIG_FILE));
  return [...prepublishProblems(manifestFile, source.value, manifest.value), ...config];
});

/** @internal */
export const checkPackSettings = Effect.fn("checkPackSettings")(function* checkPackSettings(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
  const found = yield* Effect.forEach(manifests, (name) => problemsIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.flatten(found);
});
