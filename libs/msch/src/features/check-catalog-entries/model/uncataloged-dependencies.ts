import { Array as Arr, Effect, String as Str, pipe } from "effect";

import {
  MANIFEST_FILE,
  manifestSpecifiers,
  manifestPattern,
  offsetIn,
} from "#/entities/package/index.ts";
import type { Specified } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "uncataloged-dependency";
const OWNED_ELSEWHERE: readonly string[] = ["catalog:", "workspace:", "link:", "file:"];
const ROOT_DIRECTORY = ".";
const MESSAGE =
  "is a version written in this package.json. Add it to the catalog in pnpm-workspace.yaml and write `catalog:` here, so that one entry owns the version and every package that uses the dependency moves together.";

const isOwnedElsewhere = ({ specifier }: Specified): boolean =>
  pipe(
    OWNED_ELSEWHERE,
    Arr.some((protocol) => Str.startsWith(protocol)(specifier)),
  );

const problemsIn = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    manifestSpecifiers(source),
    Arr.filter((found) => !isOwnedElsewhere(found)),
    Arr.map((found): Problem => ({
      file: entry.file,
      ...positionOf(source)(offsetIn(source)(manifestPattern(found))),
      rule: RULE,
      message: `\`${found.name}\` \`${found.specifier}\` ${MESSAGE}`,
    })),
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
