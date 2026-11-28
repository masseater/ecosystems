#!/usr/bin/env node
import { Schema } from "effect";

import { lookupReport } from "#/app/lookup-report.ts";
import { runCli } from "#/app/runtime.ts";
import { unresolvedReferences } from "#/features/check-references/index.ts";

const Row = Schema.Struct({
  file: Schema.String,
  line: Schema.Finite,
  reference: Schema.String,
  outcome: Schema.Literals(["broken", "unchecked"]),
  reason: Schema.String,
});

type RowType = typeof Row.Type;

const VERDICTS: Readonly<Record<RowType["outcome"], string>> = {
  broken: "is stale:",
  unchecked: "could not be checked:",
};

const describeRow = (row: RowType): string =>
  `${row.file}:${String(row.line)} ${row.reference} ${VERDICTS[row.outcome]} ${row.reason}`;

runCli(lookupReport({ row: Row, rows: unresolvedReferences, describe: describeRow }));
