import type { Rule } from "vite-plus/lint/plugins";

import { arrayFromAsync } from "./array-from-async.ts";
import { ecosystemReaders } from "./ecosystem-readers.ts";
import { explicitImportPath } from "./explicit-import-path.ts";
import { getOrInsert } from "./get-or-insert.ts";
import { inlineExports } from "./inline-exports.ts";
import { mcpToolLayer } from "./mcp-tool-layer.ts";
import { readonlyParameters } from "./readonly-parameters.ts";

export const CODED_RULES: Readonly<Record<string, Rule>> = {
  "array-from-async": arrayFromAsync,
  "ecosystem-readers": ecosystemReaders,
  "explicit-import-path": explicitImportPath,
  "get-or-insert": getOrInsert,
  "inline-exports": inlineExports,
  "mcp-tool-layer": mcpToolLayer,
  "readonly-parameters": readonlyParameters,
};
