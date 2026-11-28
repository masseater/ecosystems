import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import semver from "semver";

import {
  MANIFEST_FILE,
  manifestSpecifiers,
  fieldsOf,
  manifestPattern,
  offsetIn,
  quoted,
  specifiedIn,
} from "#/entities/package/index.ts";
import type { Fields, Specified } from "#/entities/package/index.ts";
import { workspaceManifest } from "#/entities/workspace/index.ts";
import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "version-range";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ALIAS = /^npm:(?:@[^/@]+\/)?[^@]+@(?<version>.+)$/u;
const PROTOCOL = /^[a-z+]+:/u;
const PATH_LIKE = "/";
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];
const MESSAGE =
  "is a range. The lockfile decides the version anyway, so a range only lets the next install move it without a diff. Write the exact version the lockfile resolves; `msch-publish` widens `dependencies` and `peerDependencies` to `^` in the published package.";

const versionOf = (specifier: string): string =>
  Option.getOrElse(groupOf("version")(ALIAS.exec(specifier)), () => specifier);

/** @internal */
export const isRange = (specifier: string): boolean => {
  const version = versionOf(specifier);
  return (
    !PROTOCOL.test(version) && !Str.includes(PATH_LIKE)(version) && semver.valid(version) === null
  );
};

const problemsFor =
  (file: string, source: string, pattern: (found: Specified) => RegExp) =>
  (found: readonly Specified[]): readonly Problem[] =>
    pipe(
      found,
      Arr.filter(({ specifier }) => isRange(specifier)),
      Arr.map((range): Problem => ({
        file,
        ...positionOf(source)(offsetIn(source)(pattern(range))),
        rule: RULE,
        message: `\`${range.name}\` \`${range.specifier}\` ${MESSAGE}`,
      })),
    );

const catalogPattern = ({ name }: Specified): RegExp =>
  new RegExp(`^\\s+["']?${quoted(name)}["']?:`, "mu");

const manifestProblems = (entry: Listed, source: string): readonly Problem[] =>
  problemsFor(entry.file, source, manifestPattern)(manifestSpecifiers(source));

const catalogSpecifiers = (settings: Fields): readonly Specified[] => [
  ...specifiedIn(settings["catalog"]),
  ...pipe(fieldsOf(settings["catalogs"]), Rec.values, Arr.flatMap(specifiedIn)),
];

const catalogProblems = Effect.fn("catalogProblems")(function* catalogProblems(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const settings = yield* workspaceManifest(root);
  const source = yield* files.readFile(file);
  return pipe(
    Option.all({ settings, source }),
    Option.map(({ settings: held, source: text }) =>
      problemsFor(file, text, catalogPattern)(catalogSpecifiers(fieldsOf(held))),
    ),
    Option.getOrElse((): readonly Problem[] => []),
  );
});

/** @internal */
export const checkExactVersions = Effect.fn("checkExactVersions")(function* checkExactVersions(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
  const listed = pipe(
    manifests,
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
  );
  const fromManifests = yield* scanText(listed, manifestProblems);
  const fromCatalogs = yield* catalogProblems(root);
  return [...fromManifests, ...fromCatalogs];
});
