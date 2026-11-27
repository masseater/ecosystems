import { DockerfileParser } from "dockerfile-ast";
import { Array as Arr, Number as Num, String as Str, pipe } from "effect";
import { parse as parseSql } from "sql-parser-cst";

import {
  collectNodes,
  isRecord,
  tomlSourceComments,
  yamlSourceComments,
} from "#/shared/lib/config-comments.ts";

import { commentsFrom } from "./found-comment.ts";

const NEXT = 1;

export const yamlComments = commentsFrom("yaml")(yamlSourceComments);

export const tomlComments = commentsFrom("toml")(tomlSourceComments);

interface SqlComment {
  readonly text: string;
  readonly range: readonly [number, number];
}

const isSqlComment = (value: unknown): value is SqlComment =>
  isRecord(value) &&
  (value["type"] === "line_comment" || value["type"] === "block_comment") &&
  typeof value["text"] === "string" &&
  Arr.isArray(value["range"]);

export const sqlComments = commentsFrom("sql")((source) => {
  const program = parseSql(source, {
    dialect: "sqlite",
    includeComments: true,
    includeRange: true,
    paramTypes: [],
  });
  return pipe(
    collectNodes(isSqlComment)(program),
    Arr.map(({ range: [start], text }) => ({ index: start, text })),
  );
});

const offsetAt =
  (lines: readonly string[]) =>
  ({ line, character }: Readonly<{ line: number; character: number }>): number =>
    character +
    pipe(
      lines,
      Arr.take(line),
      Arr.map((text) => text.length + NEXT),
      Num.sumAll,
    );

export const dockerfileComments = commentsFrom("dockerfile")((source) => {
  const lines = Str.split(source, "\n");
  return pipe(
    DockerfileParser.parse(source).getComments(),
    Arr.map((comment) => ({
      index: offsetAt(lines)(comment.getRange().start),
      text: comment.toString(),
    })),
  );
});
