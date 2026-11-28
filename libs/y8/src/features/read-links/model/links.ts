import { callAddon } from "@masseater.dev/lint-host";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { documentOf } from "#/features/run-rules/index.ts";
import type { MarkdownNode } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { Y8Error } from "#/shared/lib/errors.ts";
import { native, sourceView } from "#/shared/native/index.ts";
import type { NativeResult, SourceFile } from "#/shared/native/index.ts";

export interface LinkAt {
  readonly path: string;
  readonly line: number;
  readonly destination: string;
}

const NO_RULES = { default: false };

const destinationOf = (node: MarkdownNode): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(node.data["destination"]),
    Option.filter((value): value is string => typeof value === "string"),
  );

const linkNodes = (node: MarkdownNode): readonly MarkdownNode[] => {
  const below = pipe(node.children, Arr.flatMap(linkNodes));
  if (node.type === "link") {
    return [node, ...below];
  }
  return below;
};

const linksOfResult = (result: NativeResult): readonly LinkAt[] =>
  pipe(
    Option.fromNullishOr(result.source),
    Option.map(sourceView),
    Option.flatMap(documentOf),
    Option.map(({ root, positionOf }) =>
      pipe(
        linkNodes(root),
        Arr.flatMap((node) =>
          pipe(
            destinationOf(node),
            Option.map((destination): LinkAt => ({
              path: result.path,
              line: positionOf(node.start).line,
              destination,
            })),
            Option.toArray,
          ),
        ),
      ),
    ),
    Option.getOrElse((): readonly LinkAt[] => []),
  );

export const linksIn = (files: readonly SourceFile[]): Effect.Effect<readonly LinkAt[], Y8Error> =>
  pipe(
    callAddon({
      addon: native,
      name: "y8",
      files: files.length,
      call: (addon) => addon.lint(files, { config: NO_RULES, keepTree: true, keepSource: true }),
      failWith: failedWith,
    }),
    Effect.map(Arr.flatMap(linksOfResult)),
  );
