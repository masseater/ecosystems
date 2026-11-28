import { Array as Arr, Effect, Order, Schema, Stdio, pipe } from "effect";

import { JSON_FLAG } from "#/shared/lib/cli-contract.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { ProblemsFound, writeStdout } from "./output.ts";

const NONE_FOUND = 0;
const LINE_BREAK = "\n";

const byPlace = Order.Struct({ file: Order.String, line: Order.Number });

/** @internal */
export interface Place {
  readonly file: string;
  readonly line: number;
}

/** @internal */
export interface LookupReport<Row extends Place, Requirements> {
  readonly row: Schema.Codec<Row>;
  readonly rows: (root: string) => Effect.Effect<readonly Row[], never, Requirements>;
  readonly describe: (row: Row) => string;
}

const textOf =
  <Row extends Place>(row: Schema.Codec<Row>, describe: (row: Row) => string) =>
  (json: boolean, rows: readonly Row[]): Effect.Effect<string, Schema.SchemaError> => {
    if (json) {
      return Schema.encodeEffect(row.pipe(Schema.Array, Schema.fromJsonString))(rows);
    }
    return Effect.succeed(
      pipe(
        rows,
        Arr.map((found) => `${describe(found)}${LINE_BREAK}`),
        Arr.join(""),
      ),
    );
  };

/** @internal */
export const lookupReport = <Row extends Place, Requirements>({
  row,
  rows,
  describe,
}: LookupReport<Row, Requirements>): Effect.Effect<
  number,
  Schema.SchemaError | ProblemsFound,
  Requirements | RepositoryFiles | Stdio.Stdio
> =>
  Effect.gen(function* report() {
    const stdio = yield* Stdio.Stdio;
    const files = yield* RepositoryFiles;
    const args = yield* stdio.args;
    const found = yield* rows(files.resolve("."));
    const text = yield* textOf(row, describe)(
      Arr.contains(args, JSON_FLAG),
      Arr.sort(found, byPlace),
    );
    yield* writeStdout(text);
    if (found.length > NONE_FOUND) {
      return yield* ProblemsFound.make({ count: found.length });
    }
    return NONE_FOUND;
  });
