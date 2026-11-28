import { Array as Arr, Effect, Option, pipe } from "effect";

import {
  MANIFEST_FILE,
  isBinEntry,
  packedWorkspaces,
  publicEntriesOf,
} from "#/entities/package/index.ts";
import type { PackedWorkspace, PublicEntry } from "#/entities/package/index.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import type { BundleFailed, BundleScope } from "./consumer-bundle.ts";
import { declaredBy, manifestOf, optionalPeersOf, runtimeDependenciesOf } from "./manifest.ts";
import type { Declared, Manifest } from "./manifest.ts";
import { optionalPeerProblems, requiredPeerProblems } from "./optional-peers.ts";
import type { Located } from "./optional-peers.ts";
import { excessOf, sideEffectProblems } from "./side-effects.ts";
import { topLevelEffects } from "./top-level-effects.ts";
import { modulesToScan, usedBy } from "./usage.ts";
import type { Used } from "./usage.ts";

const BUNDLE: RuleName = "tree-shake-bundle";

const BUNDLE_CONCURRENCY = 4;

interface Package {
  readonly root: string;
  readonly workspace: PackedWorkspace;
  readonly located: Located;
  readonly manifest: typeof Manifest.Type;
}

interface Shape {
  readonly scope: BundleScope;
  readonly declared: Declared;
  readonly entries: readonly PublicEntry[];
}

const shapeOf = Effect.fn("shapeOf")(function* shapeOf({ workspace, manifest }: Package) {
  const files = yield* RepositoryFiles;
  const join = (target: string): string => files.join(workspace.directory, target);
  const entries = pipe(
    publicEntriesOf({ manifest, join, packEntries: workspace.packEntries }),
    Arr.dedupeWith(
      (left, right) => left.source === right.source && isBinEntry(left) === isBinEntry(right),
    ),
  );
  return {
    scope: { declared: runtimeDependenciesOf(manifest), bundled: workspace.alwaysBundle },
    declared: declaredBy({ declared: manifest.sideEffects, locator: { workspace, join } }),
    entries,
  } satisfies Shape;
});

const excessesOf = Effect.fn("excessesOf")(function* excessesOf({
  scope,
  declared,
  entries,
}: Shape) {
  if (declared.complete) {
    return [];
  }
  const shaken = pipe(
    entries,
    Arr.filter((entry) => !isBinEntry(entry) && !declared.entries.has(entry.source)),
  );
  const found = yield* Effect.forEach(
    shaken,
    (entry) => excessOf({ scope, effectful: declared.effectful, entry }),
    { concurrency: BUNDLE_CONCURRENCY },
  );
  return Arr.flatten(found);
});

const effectsOf = Effect.fn("effectsOf")(function* effectsOf(
  root: string,
  declared: Declared,
  used: readonly Used[],
) {
  if (!declared.claimed) {
    return [];
  }
  return yield* topLevelEffects(root, modulesToScan({ used, declared }));
});

const analyse = Effect.fn("analyse")(function* analyse(pack: Package) {
  const { root, located, manifest } = pack;
  const shape = yield* shapeOf(pack);
  const excesses = yield* excessesOf(shape);
  const used = yield* Effect.forEach(shape.entries, (entry) => usedBy(shape.scope, entry), {
    concurrency: BUNDLE_CONCURRENCY,
  });
  const effects = yield* effectsOf(root, shape.declared, used);
  return [
    ...sideEffectProblems({ file: located.file, source: located.source, excesses }),
    ...effects,
    ...optionalPeerProblems({ located, dependencies: manifest.dependencies, used }),
    ...requiredPeerProblems({ located, optional: optionalPeersOf(manifest), used }),
  ];
});

const bundleProblem = (file: string, error: BundleFailed): readonly Problem[] => [
  problemInFile(BUNDLE)(file, `does not bundle for the tree-shaking check. ${error.detail}`),
];

const workspaceProblems = Effect.fn("workspaceProblems")(function* workspaceProblems(
  root: string,
  workspace: PackedWorkspace,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(workspace.directory, MANIFEST_FILE);
  const source = yield* files.readFile(file);
  const manifest = pipe(source, Option.flatMap(manifestOf));
  if (Option.isNone(source) || Option.isNone(manifest)) {
    return [];
  }
  const located = { file, source: source.value };
  return yield* analyse({ root, workspace, located, manifest: manifest.value }).pipe(
    Effect.catchTag("BundleFailed", (error) => Effect.succeed(bundleProblem(file, error))),
  );
});

/** @internal */
export const checkTreeShaking = Effect.fn("checkTreeShaking")(function* checkTreeShaking(
  root: string,
) {
  const workspaces = yield* packedWorkspaces(root);
  const found = yield* Effect.forEach(
    workspaces,
    (workspace) => workspaceProblems(root, workspace),
    { concurrency: 1 },
  );
  return Arr.flatten(found);
});
