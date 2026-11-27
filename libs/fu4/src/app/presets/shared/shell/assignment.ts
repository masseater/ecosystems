import { Array as Arr, Option, pipe } from "effect";

import { fieldOf } from "#/app/presets/shared/syntax/index.ts";
import type { SyntaxNode } from "#/shared/config/index.ts";

export interface Target {
  readonly name: string;
  readonly subscript: boolean;
}

export const isAppending = (node: SyntaxNode): boolean =>
  pipe(
    node.children,
    Arr.some((child) => !child.named && child.type === "+="),
  );

export const targetOf = (node: SyntaxNode): Option.Option<Target> =>
  pipe(
    fieldOf("name")(node),
    Option.flatMap((name) => {
      if (name.type === "subscript") {
        return pipe(
          fieldOf("name")(name),
          Option.map((found): Target => ({ name: found.text, subscript: true })),
        );
      }
      return Option.some({ name: name.text, subscript: false });
    }),
  );
