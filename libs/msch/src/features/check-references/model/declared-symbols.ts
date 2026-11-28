import { groupOf } from "@masseater.dev/lint-host/collections";
import { Array as Arr, Effect, HashSet, Option, Record as Rec, pipe } from "effect";

import { loadLanguage, readTree } from "#/shared/lib/tree-sitter.ts";
import type { SyntaxNode } from "#/shared/lib/tree-sitter.ts";

const GRAMMAR_OF: Readonly<Record<string, string>> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  rs: "rust",
  py: "python",
  go: "go",
  java: "java",
  rb: "ruby",
  php: "php",
  cs: "c-sharp",
  cpp: "cpp",
};
const IMPLEMENTATION = "impl_item";
const NAME_FIELD = "name";
const TYPE_FIELD = "type";
const SEPARATOR = ".";
const EXTENSION = /\.(?<extension>[^./]+)$/u;
const FIRST = 0;
const ONE = 1;

export const supportedExtensions: readonly string[] = Rec.keys(GRAMMAR_OF);

export const grammarOf = (path: string): Option.Option<string> =>
  pipe(
    groupOf("extension")(EXTENSION.exec(path)),
    Option.flatMap((extension) => Rec.get(GRAMMAR_OF, extension)),
  );

const implementedType = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  pipe(
    Option.liftPredicate(node, ({ type }) => type === IMPLEMENTATION),
    Option.flatMap((implementation) =>
      Option.fromNullishOr(implementation.childForFieldName(TYPE_FIELD)),
    ),
  );

const nameNodeOf = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  pipe(
    Option.fromNullishOr(node.childForFieldName(NAME_FIELD)),
    Option.orElse(() => implementedType(node)),
  );

const suffixesOf = (chain: readonly string[]): readonly string[] =>
  pipe(
    Arr.range(FIRST, chain.length - ONE),
    Arr.map((from) => Arr.join(Arr.drop(chain, from), SEPARATOR)),
  );

const childrenOf = (node: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    node.namedChildren,
    Arr.flatMap((child) => Option.toArray(Option.fromNullishOr(child))),
  );

const namesUnder = (node: SyntaxNode, enclosing: readonly string[]): readonly string[] => {
  const own = Option.map(nameNodeOf(node), ({ text }) => text);
  const chain = Option.match(own, {
    onNone: () => enclosing,
    onSome: (name) => [...enclosing, name],
  });
  const declared = Option.match(own, { onNone: () => [], onSome: () => suffixesOf(chain) });
  return [...declared, ...Arr.flatMap(childrenOf(node), (child) => namesUnder(child, chain))];
};

export const declaredSymbols = Effect.fn("declaredSymbols")(function* declaredSymbols(
  grammar: string,
  source: string,
) {
  const language = yield* loadLanguage(grammar);
  return pipe(
    readTree({ language, source, read: (root) => HashSet.fromIterable(namesUnder(root, [])) }),
    Option.getOrElse(() => HashSet.empty<string>()),
  );
});
