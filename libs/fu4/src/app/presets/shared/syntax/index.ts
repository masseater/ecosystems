import { Array as Arr, Option, pipe } from "effect";

import type { SyntaxNode } from "#/shared/config/index.ts";

export const descendants = (node: SyntaxNode): readonly SyntaxNode[] =>
  Arr.prepend(pipe(node.children, Arr.flatMap(descendants)), node);

export const anyWithin =
  (matches: (node: SyntaxNode) => boolean) =>
  (root: SyntaxNode): boolean =>
    pipe(descendants(root), Arr.some(matches));

export const fieldOf =
  (field: string) =>
  (node: SyntaxNode): Option.Option<SyntaxNode> =>
    pipe(
      node.children,
      Arr.findFirst((child) => child.field === field),
    );

export const fieldTextOf =
  (field: string) =>
  (node: SyntaxNode): Option.Option<string> =>
    pipe(
      fieldOf(field)(node),
      Option.map((child) => child.text),
    );

export const fieldsOf =
  (field: string) =>
  (node: SyntaxNode): readonly SyntaxNode[] =>
    pipe(
      node.children,
      Arr.filter((child) => child.field === field),
    );

export const isType =
  (...types: readonly string[]) =>
  (node: SyntaxNode): boolean =>
    types.includes(node.type);

const typedWithin =
  (select: (node: SyntaxNode) => readonly SyntaxNode[]) =>
  (...types: readonly string[]) =>
  (node: SyntaxNode): readonly SyntaxNode[] =>
    pipe(select(node), Arr.filter(isType(...types)));

export const namedOfType = typedWithin((node) => node.namedChildren);

export const descendantsOfType = typedWithin(descendants);

export const ofType = (
  ...types: readonly string[]
): ((node: Option.Option<SyntaxNode>) => Option.Option<SyntaxNode>) =>
  Option.filter(isType(...types));
