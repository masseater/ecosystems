import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { existsAt, isDirectoryAt, isIgnored, staticPrefix } from "./path-existence.ts";
import { ACTION_DEFINITIONS, producedPaths, workflowReferences } from "./workflow-references.ts";
import type { ReferenceKind, WorkflowReference } from "./workflow-references.ts";

const RULE: RuleName = "workflow-path";
const WORKFLOW_DIRECTORY = ".github/workflows/";
const WORKFLOW_EXTENSIONS = [".yml", ".yaml"];
const READ_CONCURRENCY = 8;
const SEPARATOR = "/";

const EXPECTED: Readonly<Record<ReferenceKind, string>> = {
  action: "a directory with action.yml",
  directory: "a directory",
  file: "a file",
  glob: "a pattern that matches a tracked file",
  script: "a file",
};

type Resolver = (root: string, path: string) => Effect.Effect<boolean, never, RepositoryFiles>;

const isWorkflow = (file: string): boolean =>
  Str.startsWith(WORKFLOW_DIRECTORY)(file) &&
  pipe(
    WORKFLOW_EXTENSIONS,
    Arr.some((extension) => Str.endsWith(extension)(file)),
  );

const matchesAny = Effect.fn("matchesAny")(function* matchesAny(
  root: string,
  pathspecs: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const matched = yield* files.matchingFiles(root, pathspecs);
  return Arr.isReadonlyArrayNonEmpty(matched);
});

const matchesGlob: Resolver = (root, path) => matchesAny(root, [`:(glob)${path}`]);

const hasAction: Resolver = Effect.fn("hasAction")(function* hasAction(root: string, path: string) {
  const found = yield* Effect.forEach(
    ACTION_DEFINITIONS,
    (name) => existsAt(root, `${path}${SEPARATOR}${name}`),
    {
      concurrency: 1,
    },
  );
  return pipe(found, Arr.some(Boolean));
});

const suffixAt =
  (segments: readonly string[]) =>
  (index: number): string =>
    `:(glob)**/${pipe(segments, Arr.drop(index), Arr.join(SEPARATOR))}`;

const findsScript: Resolver = Effect.fn("findsScript")(function* findsScript(
  root: string,
  path: string,
) {
  if (yield* existsAt(root, path)) {
    return true;
  }
  const segments = Str.split(path, SEPARATOR);
  return yield* matchesAny(root, Arr.makeBy(segments.length, suffixAt(segments)));
});

const RESOLVERS: Readonly<Record<ReferenceKind, Resolver>> = {
  action: hasAction,
  directory: isDirectoryAt,
  file: existsAt,
  glob: matchesGlob,
  script: findsScript,
};

const overlaps =
  (path: string) =>
  (produced: string): boolean =>
    produced === path ||
    Str.startsWith(`${path}${SEPARATOR}`)(produced) ||
    Str.startsWith(`${produced}${SEPARATOR}`)(path);

const isMissing = Effect.fn("isMissing")(function* isMissing(
  root: string,
  produced: readonly string[],
  found: WorkflowReference,
) {
  const prefix = staticPrefix(found.path);
  if (pipe(produced, Arr.some(overlaps(prefix)))) {
    return false;
  }
  if (yield* RESOLVERS[found.kind](root, found.path)) {
    return false;
  }
  return !(yield* isIgnored(root, found.path));
});

const problemOf =
  (file: string, source: string) =>
  (found: WorkflowReference): Problem => ({
    file,
    ...positionOf(source)(found.offset),
    rule: RULE,
    message: `${found.field} names ${found.path}, which is not ${EXPECTED[found.kind]} in this repository. Point it at a path that exists or remove it.`,
  });

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(root: string, workflow: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, workflow);
  const source = yield* files.readFile(file);
  if (Option.isNone(source)) {
    return [];
  }
  const produced = producedPaths(source.value);
  const missing = yield* Effect.filter(workflowReferences(source.value), (found) =>
    isMissing(root, produced, found),
  );
  return pipe(missing, Arr.map(problemOf(file, source.value)));
});

/** @internal */
export const checkWorkflowPaths = Effect.fn("checkWorkflowPaths")(function* checkWorkflowPaths(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const found = yield* Effect.forEach(
    pipe(listed, Arr.filter(isWorkflow)),
    (workflow) => problemsIn(root, workflow),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
