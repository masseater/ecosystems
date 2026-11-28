import { baseName, parent } from "@masseater.dev/path-kit";
import type { ParserServices, TypedContext } from "@r_masseater/oxlint-typed-rules";
import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";
import type { ESTree, Rule, Visitor } from "vite-plus/lint/plugins";

import { typedRuleOf } from "./typed-rule.ts";

const MESSAGE_ID = "spellOut";
const MESSAGE =
  "`{{specifier}}` does not name a file. Write `{{fixed}}`: Node ESM and TypeScript nodenext resolve neither a missing extension nor a directory index, so spelling out the file works under every resolver.";

const RELATIVE = /^\.{1,2}(?:\/|$)/u;
const PARTS = /^(?<path>[^?]*)(?<query>.*)$/su;
const TRAILING_SEPARATORS = /\/+$/u;
const DIRECTORY_NAMES: readonly string[] = [".", ".."];
const INDEX = "index.";
const DEFAULT_QUOTE = '"';
const FIRST = 0;

interface Parts {
  readonly path: string;
  readonly query: string;
}

const partsOf = (specifier: string): Option.Option<Parts> =>
  pipe(
    Str.match(PARTS)(specifier),
    Option.flatMap((matched) => Option.fromNullishOr(matched.groups)),
    Option.map((groups) => ({ path: groups["path"] ?? "", query: groups["query"] ?? "" })),
  );

const completionOf = (resolved: string, path: string): Option.Option<string> => {
  const file = baseName(resolved);
  const name = baseName(path);
  const index = Str.startsWith(INDEX)(file);
  if (Arr.contains(DIRECTORY_NAMES, name)) {
    return Option.liftPredicate(`/${file}`, () => index);
  }
  if (Str.startsWith(`${name}.`)(file)) {
    return Option.some(Str.slice(name.length)(file));
  }
  return Option.liftPredicate(`/${file}`, () => index && baseName(parent(resolved)) === name);
};

const resolvedFileOf = (
  services: ParserServices,
  source: ESTree.StringLiteral,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(services.getSymbolAtLocation(source)),
    Option.flatMap((symbol) => Arr.head(symbol.declarations)),
    Option.map((declaration) => declaration.getSourceFile().fileName),
  );

const fixedOf = (services: ParserServices, source: ESTree.StringLiteral): Option.Option<string> =>
  pipe(
    partsOf(source.value),
    Option.filter(({ path }) => RELATIVE.test(path)),
    Option.flatMap(({ path, query }) =>
      pipe(
        resolvedFileOf(services, source),
        Option.flatMap((resolved) =>
          completionOf(resolved, Str.replace(TRAILING_SEPARATORS, "")(path)),
        ),
        Option.map(
          (completion) => `${Str.replace(TRAILING_SEPARATORS, "")(path)}${completion}${query}`,
        ),
      ),
    ),
  );

const quoteOf = (source: ESTree.StringLiteral): string =>
  pipe(
    Option.fromNullishOr(source.raw),
    Option.flatMap(Str.charAt(FIRST)),
    Option.getOrElse(() => DEFAULT_QUOTE),
  );

const isStringLiteral = (node: ESTree.Node | null): node is ESTree.StringLiteral =>
  Predicate.isNotNull(node) && node.type === "Literal" && Predicate.isString(node.value);

const visitorOf = (context: TypedContext, services: ParserServices): Visitor => {
  const check = (source: ESTree.Node | null): void => {
    if (!isStringLiteral(source)) {
      return;
    }
    const fixed = fixedOf(services, source);
    if (Option.isSome(fixed)) {
      context.report({
        node: source,
        messageId: MESSAGE_ID,
        data: { specifier: source.value, fixed: fixed.value },
        fix: (fixer) =>
          fixer.replaceText(source, `${quoteOf(source)}${fixed.value}${quoteOf(source)}`),
      });
    }
  };
  return {
    ImportDeclaration: (node): void => {
      check(node.source);
    },
    ExportAllDeclaration: (node): void => {
      check(node.source);
    },
    ExportNamedDeclaration: (node): void => {
      check(node.source);
    },
    ImportExpression: (node): void => {
      check(node.source);
    },
  };
};

export const explicitImportPath: Rule = typedRuleOf({
  meta: { type: "suggestion", fixable: "code", messages: { [MESSAGE_ID]: MESSAGE } },
  visitorOf,
});
