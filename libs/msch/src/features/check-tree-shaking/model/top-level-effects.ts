import { Array as Arr, Effect, Option, Predicate, pipe } from "effect";

import { typeScriptCompiler } from "#/entities/project/index.ts";
import {
  isExpressionStatement,
  isImportDeclaration,
  isStringLiteral,
} from "#/shared/lib/compiler.ts";
import type { API, Node } from "#/shared/lib/compiler.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { problemAt } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "top-level-effect";
const CODE = /\.[cm]?[jt]sx?$/u;
const READ_CONCURRENCY = 16;
const IMPORT_MESSAGE =
  "imports a module only for its effect, but sideEffects in package.json does not list this file, so a bundler drops the import. Import what the module exports, or list the entry that exists for its effect in sideEffects.";
const STATEMENT_MESSAGE =
  "runs a statement at the top level for its effect, but sideEffects in package.json does not list this file, so a bundler drops the module when nothing it exports is used. Move the statement into a function that the caller runs, or list the entry that exists for its effect in sideEffects.";

const isEffect = (statement: Node): boolean => {
  if (isExpressionStatement(statement)) {
    return !isStringLiteral(statement.expression);
  }
  return isImportDeclaration(statement) && Predicate.isUndefined(statement.importClause);
};

const messageOf = (statement: Node): string => {
  if (isImportDeclaration(statement)) {
    return IMPORT_MESSAGE;
  }
  return STATEMENT_MESSAGE;
};

const problemsIn =
  (api: API) =>
  (file: string) =>
  (source: string): readonly Problem[] => {
    const retained = api.createSourceFile(file, source);
    const problems = pipe(
      retained.sourceFile.statements,
      Arr.fromIterable,
      Arr.filter(isEffect),
      Arr.map((statement) => problemAt({ rule: RULE, message: messageOf(statement) })(statement)),
    );
    retained.dispose();
    return problems;
  };

/** @internal */
export const topLevelEffects = Effect.fn("topLevelEffects")(function* topLevelEffects(
  root: string,
  modules: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const compiler = yield* typeScriptCompiler;
  const names = yield* files.ownedFiles(root);
  const owned = new Set(
    pipe(
      names,
      Arr.map((name) => files.join(root, name)),
    ),
  );
  const sources = pipe(
    modules,
    Arr.filter((file) => owned.has(file) && CODE.test(file)),
  );
  const found = yield* Effect.forEach(
    sources,
    (file) =>
      files.readFile(file).pipe(
        Effect.map((text) =>
          pipe(
            text,
            Option.map(problemsIn(compiler.api)(file)),
            Option.getOrElse((): readonly Problem[] => []),
          ),
        ),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
}, Effect.scoped);
