import { Array as Arr, pipe } from "effect";
import type { Context, ESTree, Rule } from "vite-plus/lint/plugins";

const MESSAGE =
  "export は宣言に付ける（export const・export function など）。ファイルの末尾で export { … } にまとめない。";
const TYPE = "type";
const CLASS_NAME = "ClassName";

const isList = (node: ESTree.ExportNamedDeclaration): boolean =>
  node.declaration === null && node.source === null && !Arr.isReadonlyArrayEmpty(node.specifiers);

const localName = (specifier: ESTree.ExportSpecifier): string => {
  if (specifier.local.type === "Literal") {
    return specifier.local.value;
  }
  return specifier.local.name;
};

const isClass = (context: Context, name: string): boolean =>
  pipe(
    context.sourceCode.scopeManager.scopes,
    Arr.flatMap((scope) => scope.variables),
    Arr.filter((variable) => variable.name === name),
    Arr.flatMap((variable) => variable.defs),
    (defs) =>
      Arr.isReadonlyArrayNonEmpty(defs) &&
      pipe(
        defs,
        Arr.every(({ type }) => type === CLASS_NAME),
      ),
  );

const isTypeOnlyClass =
  (context: Context, node: ESTree.ExportNamedDeclaration) =>
  (specifier: ESTree.ExportSpecifier): boolean =>
    (node.exportKind === TYPE || specifier.exportKind === TYPE) &&
    isClass(context, localName(specifier));

export const inlineExports: Rule = {
  meta: { type: "suggestion" },
  create: (context) => ({
    ExportNamedDeclaration: (node): void => {
      if (isList(node) && !pipe(node.specifiers, Arr.every(isTypeOnlyClass(context, node)))) {
        context.report({ node, message: MESSAGE });
      }
    },
  }),
};
