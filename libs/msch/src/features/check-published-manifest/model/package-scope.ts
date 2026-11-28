import { Option, String as Str, pipe } from "effect";

import type { PublishedFile } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { problemAtIndex } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "package-scope";
const SCOPE = "@r_masseater/";
const NAME_KEY = '"name"';
const START = 0;

const unscopedName = ({ manifest }: PublishedFile): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(manifest.name),
    Option.filter((name) => !Str.startsWith(SCOPE)(name)),
  );

const nameIndex = (source: string): number =>
  pipe(
    Str.indexOf(NAME_KEY)(source),
    Option.getOrElse(() => START),
  );

const messageFor = (name: string): string =>
  `Packages are published only under the ${SCOPE} scope. Rename "${name}" to "${SCOPE}${Str.replace(/^@[^/]+\//u, "")(name)}".`;

/** @internal */
export const scopeProblems = (found: PublishedFile): readonly Problem[] =>
  pipe(
    unscopedName(found),
    Option.map((name) =>
      problemAtIndex(RULE)(found.entry.file, found.source)(
        nameIndex(found.source),
        messageFor(name),
      ),
    ),
    Option.toArray,
  );
