#!/usr/bin/env node
import { Schema } from "effect";

import { lookupReport } from "#/app/lookup-report.ts";
import { runCli } from "#/app/runtime.ts";
import { missingVersions } from "#/features/check-published-versions/index.ts";

const Row = Schema.Struct({
  file: Schema.String,
  line: Schema.Finite,
  dependency: Schema.String,
  reason: Schema.String,
});

type RowType = typeof Row.Type;

const describeRow = (row: RowType): string =>
  `${row.file}:${String(row.line)} ${row.dependency} ${row.reason}`;

runCli(lookupReport({ row: Row, rows: missingVersions, describe: describeRow }));
