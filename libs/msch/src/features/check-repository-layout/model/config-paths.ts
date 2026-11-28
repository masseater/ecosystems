import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { unmatchedWorkspacePatterns } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { cargoMentions } from "./cargo-paths.ts";
import { existsAt, isIgnored } from "./path-existence.ts";
import { indexOfText } from "./path-mention.ts";
import type { PathMention } from "./path-mention.ts";
import { tsconfigMentions } from "./tsconfig-paths.ts";

const RULE: RuleName = "config-path";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const CARGO_MANIFEST = /(?:^|\/)Cargo\.toml$/u;
const TSCONFIG = /(?:^|\/)tsconfig(?:\.[\w-]+)?\.json$/u;
const OUTSIDE = "..";
const READ_CONCURRENCY = 8;

const isMissing = Effect.fn("isMissing")(function* isMissing(
  root: string,
  file: string,
  mention: PathMention,
) {
  const files = yield* RepositoryFiles;
  const relatives = pipe(
    mention.candidates,
    Arr.map((candidate) => files.relative(root, files.resolve(files.dirname(file), candidate))),
    Arr.filter((relative) => !Str.startsWith(OUTSIDE)(relative)),
  );
  if (!Arr.isReadonlyArrayNonEmpty(relatives)) {
    return false;
  }
  const present = yield* Effect.forEach(relatives, (relative) => existsAt(root, relative), {
    concurrency: READ_CONCURRENCY,
  });
  if (pipe(present, Arr.some(Boolean))) {
    return false;
  }
  const ignored = yield* Effect.forEach(relatives, (relative) => isIgnored(root, relative), {
    concurrency: READ_CONCURRENCY,
  });
  return !pipe(ignored, Arr.some(Boolean));
});

const byIndex = Order.mapInput(Order.Number, ({ index }: PathMention) => index);

const problemOf =
  (file: string, source: string) =>
  (mention: PathMention): Problem => ({
    file,
    ...positionOf(source)(mention.index),
    rule: RULE,
    message: `${mention.field} names ${mention.text}, which does not exist in this repository. Point it at a path that exists or remove the entry.`,
  });

const mentionsIn = Effect.fn("mentionsIn")(function* mentionsIn(file: string, source: string) {
  if (CARGO_MANIFEST.test(file)) {
    return cargoMentions(source);
  }
  return yield* tsconfigMentions(file, source);
});

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, name);
  const source = yield* files.readFile(file);
  if (Option.isNone(source)) {
    return [];
  }
  const mentions = yield* mentionsIn(file, source.value);
  const missing = yield* Effect.filter(mentions, (mention) => isMissing(root, file, mention), {
    concurrency: READ_CONCURRENCY,
  });
  return pipe(Arr.sort(missing, byIndex), Arr.map(problemOf(file, source.value)));
});

const unmatchedPatterns = Effect.fn("unmatchedPatterns")(function* unmatchedPatterns(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const source = yield* files.readFile(file);
  if (Option.isNone(source)) {
    return [];
  }
  const patterns = yield* unmatchedWorkspacePatterns(root);
  return pipe(
    patterns,
    Arr.map((pattern): Problem => ({
      file,
      ...positionOf(source.value)(indexOfText(source.value)(pattern)),
      rule: RULE,
      message: `packages lists ${pattern}, which matches no workspace package. Point it at directories that have a package.json or remove the entry.`,
    })),
  );
});

/** @internal */
export const checkConfigPaths = Effect.fn("checkConfigPaths")(function* checkConfigPaths(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const owned = yield* files.ownedFiles(root);
  const configs = pipe(
    owned,
    Arr.filter((name) => CARGO_MANIFEST.test(name) || TSCONFIG.test(name)),
  );
  const [found, patterns] = yield* Effect.all(
    [
      Effect.forEach(configs, (name) => problemsIn(root, name), { concurrency: READ_CONCURRENCY }),
      unmatchedPatterns(root),
    ],
    { concurrency: "unbounded" },
  );
  return [...Arr.flatten(found), ...patterns];
});
