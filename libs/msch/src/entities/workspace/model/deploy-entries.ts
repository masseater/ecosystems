import { Array as Arr, Effect, Option, Predicate, Schema, pipe } from "effect";
import { parse } from "vite-plus";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { KeySchema, childrenOf, keyName, stringsIn } from "./config-literal.ts";

const MAIN_KEY = "main";
const FRAMEWORK_SITES = "Website";
const READ_CONCURRENCY = 16;
const SCRIPT = /\.[cm]?tsx?$/u;
const SKIPPED = /\.test\.|\.d\.[cm]?ts$/u;
const ALCHEMY_IMPORT = /from\s+["'](?:alchemy|@alchemy\.run)(?:\/[^"']*)?["']/u;
const MAIN_PROPERTY = /\bmain\s*:/u;
const decodeKey = Schema.decodeUnknownOption(KeySchema);
const SiteNamespace = Schema.Struct({
  type: Schema.Literal("Identifier"),
  name: Schema.Literal(FRAMEWORK_SITES),
});
const SiteResource = Schema.Struct({
  type: Schema.Literal("MemberExpression"),
  object: SiteNamespace,
});
const FrameworkSite = Schema.Struct({
  type: Schema.Literal("CallExpression"),
  callee: SiteResource,
});
const decodeFrameworkSite = Schema.decodeUnknownOption(FrameworkSite);

const isMainProperty = (node: Readonly<Record<string, unknown>>): boolean =>
  node["type"] === "Property" &&
  pipe(
    decodeKey(node["key"]),
    Option.exists((key) => keyName(key) === MAIN_KEY),
  );

type Skip = (node: unknown) => boolean;

const skipNothing: Skip = () => false;

const isFrameworkSite: Skip = (node) => Option.isSome(decodeFrameworkSite(node));

const mainTargetsIn = (skip: Skip): ((node: unknown) => readonly string[]) => {
  const visit = (node: unknown): readonly string[] => {
    if (skip(node)) {
      return [];
    }
    if (Predicate.isReadonlyObject(node) && isMainProperty(node)) {
      return pipe(
        stringsIn(node["value"]),
        Arr.head,
        Option.map(({ text }) => text),
        Option.toArray,
      );
    }
    return pipe(childrenOf(node), Arr.flatMap(visit));
  };
  return visit;
};

interface Declaring {
  readonly root: string;
  readonly file: string;
  readonly skip: Skip;
}

const declaredIn = Effect.fn("declaredIn")(function* declaredIn({ root, file, skip }: Declaring) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  if (Option.isNone(text) || !ALCHEMY_IMPORT.test(text.value) || !MAIN_PROPERTY.test(text.value)) {
    return [];
  }
  const parsed = yield* Effect.promise(() => parse(file, text.value, { lang: "ts" }));
  return pipe(
    mainTargetsIn(skip)(parsed.program),
    Arr.map((target) => files.join(files.dirname(file), target)),
  );
});

const entriesOutside = Effect.fn("entriesOutside")(function* entriesOutside(
  root: string,
  skip: Skip,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const declaring = pipe(
    listed,
    Arr.filter((file) => SCRIPT.test(file) && !SKIPPED.test(file)),
  );
  const found = yield* Effect.forEach(declaring, (file) => declaredIn({ root, file, skip }), {
    concurrency: READ_CONCURRENCY,
  });
  return pipe(
    Arr.flatten(found),
    Arr.filter((file) => Arr.contains(listed, file)),
    Arr.dedupe,
  );
});

export const deployEntries = Effect.fn("deployEntries")(function* deployEntries(root: string) {
  return yield* entriesOutside(root, skipNothing);
});

export const bundledEntries = Effect.fn("bundledEntries")(function* bundledEntries(root: string) {
  return yield* entriesOutside(root, isFrameworkSite);
});
