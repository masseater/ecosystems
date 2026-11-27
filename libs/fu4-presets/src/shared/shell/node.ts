import { ancestorsBy } from "@masseater.dev/lint-host/collections";
import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { anyWithin } from "#/shared/syntax/index.ts";

export const parentOf = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  Option.fromNullishOr(node.parent);

export const firstNamed = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  Arr.head(node.namedChildren);

export const sameNode =
  (node: SyntaxNode) =>
  (other: SyntaxNode): boolean =>
    other.id === node.id;

const isMissingName = (node: SyntaxNode): boolean =>
  node.isMissing &&
  Option.exists(
    parentOf(node),
    (parent) =>
      parent.type === "command_name" &&
      Option.exists(parentOf(parent), (command) =>
        pipe(
          command.namedChildren,
          Arr.some((child) => child.type === "variable_assignment"),
        ),
      ),
  );

export const hasError = anyWithin(
  (node) => node.isError || (node.isMissing && !isMissingName(node)),
);

export const ancestors = ancestorsBy(parentOf);

export const keywordOf = (node: SyntaxNode): string =>
  pipe(
    Arr.head(node.children),
    Option.map((child) => child.text),
    Option.getOrElse(() => ""),
  );
