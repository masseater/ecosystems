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

const declaredPrepublish = (manifest: typeof Manifest.Type): Option.Option<string> =>
  pipe(Option.fromUndefinedOr(manifest.scripts), Option.flatMap(Rec.get(PREPUBLISH_SCRIPT)));

const prepublishProblems = (
  file: string,
  source: string,
  manifest: typeof Manifest.Type,
): readonly Problem[] => {
  if (Option.contains(declaredPrepublish(manifest), PREPUBLISH_COMMAND)) {
    return [];
  }
  return [
    {
      file,
      ...positionOf(source)(
        Option.getOrElse(Str.indexOf(`"${PREPUBLISH_SCRIPT}"`)(source), () => START),
      ),
      rule: PREPUBLISH_RULE,
      message: `This package is published, so its ${PREPUBLISH_SCRIPT} script must be exactly \`${PREPUBLISH_COMMAND}\`. That one command refuses npm publish, which leaves catalog: in dependencies, and builds the package. Writing the guard in each package leaves some packages without it. \`vp exec msch-fix\` rewrites it.`,
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

interface Published {
  readonly file: string;
  readonly source: string;
  readonly manifest: typeof Manifest.Type;
}

const readPublished = Effect.fn("readPublished")(function* readPublished(
  root: string,
  manifestName: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, manifestName);
  const source = yield* files.readFile(file);
  return Option.all({ source, manifest: publishedManifest(source) }).pipe(
    Option.map(({ source: text, manifest }): Published => ({ file, source: text, manifest })),
  );
});

const inPublished = <Item, Fail, Needs>(
  root: string,
  manifestName: string,
  run: (published: Published) => Effect.Effect<readonly Item[], Fail, Needs>,
): Effect.Effect<readonly Item[], Fail, Needs | RepositoryFiles> =>
  readPublished(root, manifestName).pipe(
    Effect.flatMap(
      Option.match({
        onNone: (): Effect.Effect<readonly Item[]> => Effect.succeed([]),
        onSome: run,
      }),
    ),
  );

const problemsIn = (
  root: string,
  manifestName: string,
): Effect.Effect<readonly Problem[], never, RepositoryFiles> =>
  inPublished(root, manifestName, ({ file, source, manifest }) =>
    Effect.gen(function* problemsOf() {
      const files = yield* RepositoryFiles;
      const config = yield* configProblems(
        files.join(root, files.dirname(manifestName), CONFIG_FILE),
      );
      return [...prepublishProblems(file, source, manifest), ...config];
    }),
  );

const manifestNames = Effect.fn("manifestNames")(function* manifestNames(root: string) {
  const files = yield* RepositoryFiles;
  return yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
});

/** @internal */
export const checkPackSettings = Effect.fn("checkPackSettings")(function* checkPackSettings(
  root: string,
) {
  const manifests = yield* manifestNames(root);
  const found = yield* Effect.forEach(manifests, (name) => problemsIn(root, name), {
    concurrency: READ_CONCURRENCY,
  });
  return Arr.flatten(found);
});

const PREPUBLISH_ENTRY = /(?<key>"prepublishOnly"\s*:\s*)"(?:[^"\\]|\\.)*"/u;

const missingScriptLine = (manifestName: string): string =>
  `${manifestName}: has no ${PREPUBLISH_SCRIPT} script. Add \`"${PREPUBLISH_SCRIPT}": "${PREPUBLISH_COMMAND}"\` to its scripts by hand.`;

const rewrittenLine = (manifestName: string): string =>
  `${manifestName}: ${PREPUBLISH_SCRIPT} now runs \`${PREPUBLISH_COMMAND}\`.`;

interface PrepublishFix {
  readonly lines: readonly string[];
  readonly rewritten: Option.Option<string>;
}

const NO_FIX: PrepublishFix = { lines: [], rewritten: Option.none() };

const prepublishFix = (
  manifestName: string,
  source: string,
  manifest: typeof Manifest.Type,
): PrepublishFix => {
  const declared = declaredPrepublish(manifest);
  if (Option.contains(declared, PREPUBLISH_COMMAND)) {
    return NO_FIX;
  }
  if (Option.isNone(declared)) {
    return { lines: [missingScriptLine(manifestName)], rewritten: Option.none() };
  }
  return {
    lines: [rewrittenLine(manifestName)],
    rewritten: Option.some(Str.replace(PREPUBLISH_ENTRY, `$<key>"${PREPUBLISH_COMMAND}"`)(source)),
  };
};

const fixPrepublishIn = (
  root: string,
  manifestName: string,
): Effect.Effect<readonly string[], never, RepositoryFiles> =>
  inPublished(root, manifestName, ({ file, source, manifest }) =>
    Effect.gen(function* fixOf() {
      const files = yield* RepositoryFiles;
      const fix = prepublishFix(manifestName, source, manifest);
      yield* Option.match(fix.rewritten, {
        onNone: () => Effect.void,
        onSome: (text) => files.writeFile(file, text),
      });
      return fix.lines;
    }),
  );

/** @internal */
export const fixPrepublishScripts = Effect.fn("fixPrepublishScripts")(
  function* fixPrepublishScripts(root: string) {
    const manifests = yield* manifestNames(root);
    const lines = yield* Effect.forEach(manifests, (name) => fixPrepublishIn(root, name), {
      concurrency: READ_CONCURRENCY,
    });
    return Arr.flatten(lines);
  },
);
