#!/usr/bin/env node
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { lookupReport } from "#/app/lookup-report.ts";
import { runCli } from "#/app/runtime.ts";
import { upstreamExitsMet } from "#/features/check-upstream-exits/index.ts";
import type { FileExit } from "#/features/check-upstream-exits/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const MetRow = Schema.Struct({
  file: Schema.String,
  line: Schema.Finite,
  section: Schema.String,
  key: Schema.String,
  condition: Schema.String,
  outcome: Schema.Literals(["met", "unchecked"]),
});

type MetRowType = typeof MetRow.Type;

const VERDICTS: Readonly<Record<MetRowType["outcome"], string>> = {
  met: "is met. Remove the deviation and run verify.",
  unchecked: "could not be checked. Check it by hand or rerun where the lookup is reachable.",
};

const describeRow = (row: MetRowType): string =>
  `${row.file}:${String(row.line)} ${row.section} ${row.key}: the exit condition ${row.condition} ${VERDICTS[row.outcome]}`;

const rowsIn = Effect.fn("rowsIn")(function* rowsIn(root: string) {
  const files = yield* RepositoryFiles;
  const met = yield* upstreamExitsMet(root);
  return pipe(
    met,
    Arr.map(({ file, met: { entry, condition, outcome } }: FileExit): MetRowType => ({
      file: files.relative(root, file),
      line: entry.line,
      section: entry.section,
      key: entry.key,
      condition,
      outcome,
    })),
  );
});

runCli(lookupReport({ row: MetRow, rows: rowsIn, describe: describeRow }));
