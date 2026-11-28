import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { manifestPattern } from "#/entities/package/index.ts";
import type { Specified } from "#/entities/package/index.ts";
import { workspaceManifest } from "#/entities/workspace/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { withCatalogEntries } from "./catalog-source.ts";
import type { Catalog } from "./catalog-source.ts";
import { installedManifests, uncatalogedIn } from "./uncataloged-dependencies.ts";

const CATALOG_SPECIFIER = "catalog:";
const READ_CONCURRENCY = 16;
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const EMPTY = "";

interface Move {
  readonly file: string;
  readonly found: Specified;
}

interface Manifest {
  readonly file: string;
  readonly source: string;
}

type Verdict =
  | { readonly kind: "add"; readonly move: Move }
  | { readonly kind: "keep"; readonly move: Move }
  | { readonly kind: "clash"; readonly move: Move; readonly held: string };

const verdictFor = (catalog: Catalog, move: Move): readonly [Catalog, Verdict] => {
  const held = Rec.get(catalog, move.found.name);
  if (Option.isNone(held)) {
    return [
      { ...catalog, [move.found.name]: move.found.specifier },
      { kind: "add", move },
    ];
  }
  if (held.value === move.found.specifier) {
    return [catalog, { kind: "keep", move }];
  }
  return [catalog, { kind: "clash", move, held: held.value }];
};

const movesIn = ({ file, source }: Manifest): readonly Move[] =>
  pipe(
    uncatalogedIn(source),
    Arr.map((found): Move => ({ file, found })),
  );

const addedEntries = (verdicts: readonly Verdict[]): Catalog =>
  pipe(
    verdicts,
    Arr.filter((verdict) => verdict.kind === "add"),
    Arr.map(({ move }): readonly [string, string] => [move.found.name, move.found.specifier]),
    Rec.fromEntries,
  );

const rewrite = (source: string, found: Specified): string =>
  pipe(source, Str.replace(manifestPattern(found), `"${found.name}": "${CATALOG_SPECIFIER}"`));

const rewrittenSource = (source: string, finds: readonly Specified[]): string => {
  const [rewritten] = Arr.mapAccum(finds, source, (text, found): readonly [string, Specified] => [
    rewrite(text, found),
    found,
  ]);
  return rewritten;
};

const clashLine = (relative: (file: string) => string, verdict: Verdict): readonly string[] => {
  if (verdict.kind !== "clash") {
    return [];
  }
  const { move, held } = verdict;
  return [
    `${relative(move.file)}: \`${move.found.name}\` \`${move.found.specifier}\` differs from the catalog's \`${held}\`. Align the versions by hand.`,
  ];
};

const readManifests = Effect.fn("readManifests")(function* readManifests(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* installedManifests(root);
  const read = yield* Effect.forEach(
    listed,
    ({ file }) =>
      files
        .readFile(file)
        .pipe(
          Effect.map(Option.map((source): Manifest => ({ file, source }))),
          Effect.map(Option.toArray),
        ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(read);
});

const heldCatalog = Effect.fn("heldCatalog")(function* heldCatalog(root: string) {
  const manifest = yield* workspaceManifest(root);
  return pipe(
    manifest,
    Option.flatMap((settings) => Option.fromUndefinedOr(settings.catalog)),
    Option.getOrElse((): Catalog => ({})),
  );
});

const addToCatalog = Effect.fn("addToCatalog")(function* addToCatalog(
  root: string,
  added: Catalog,
) {
  if (Rec.isEmptyRecord(added)) {
    return;
  }
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const source = yield* files.readFile(file);
  yield* files.writeFile(
    file,
    pipe(
      source,
      Option.getOrElse(() => EMPTY),
      withCatalogEntries(added),
    ),
  );
});

const rewriteManifest = Effect.fn("rewriteManifest")(function* rewriteManifest(
  { file, source }: Manifest,
  moved: readonly Verdict[],
) {
  const files = yield* RepositoryFiles;
  const finds = pipe(
    moved,
    Arr.filter(({ move }) => move.file === file),
    Arr.map(({ move }) => move.found),
  );
  if (Arr.isReadonlyArrayEmpty(finds)) {
    return;
  }
  yield* files.writeFile(file, rewrittenSource(source, finds));
});

const movedLine = (relative: (file: string) => string, { move }: Verdict): string =>
  `${relative(move.file)}: \`${move.found.name}\` now uses the catalog.`;

const reportLines = (
  relative: (file: string) => string,
  verdicts: readonly Verdict[],
): readonly string[] => [
  ...pipe(
    verdicts,
    Arr.filter(({ kind }) => kind !== "clash"),
    Arr.map((verdict) => movedLine(relative, verdict)),
  ),
  ...pipe(
    verdicts,
    Arr.flatMap((verdict) => clashLine(relative, verdict)),
  ),
];

/** @internal */
export const fixUncatalogedDependencies = Effect.fn("fixUncatalogedDependencies")(
  function* fixUncatalogedDependencies(root: string) {
    const files = yield* RepositoryFiles;
    const manifests = yield* readManifests(root);
    const held = yield* heldCatalog(root);
    const [, verdicts] = pipe(manifests, Arr.flatMap(movesIn), Arr.mapAccum(held, verdictFor));
    yield* addToCatalog(root, addedEntries(verdicts));
    const moved = pipe(
      verdicts,
      Arr.filter(({ kind }) => kind !== "clash"),
    );
    yield* Effect.forEach(manifests, (manifest) => rewriteManifest(manifest, moved), {
      concurrency: READ_CONCURRENCY,
    });
    return reportLines((file) => files.relative(root, file), verdicts);
  },
);
