import { join, parent } from "@masseater.dev/path-kit";
import { Array as Arr, pipe } from "effect";

import type { Listed } from "#/shared/lib/scanned-files.ts";

const FOREIGN_LOCKFILE =
  /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?)$/u;
const PLUGIN_LOCKFILE = /(?:^|\/)bun\.lock$/u;
const PLUGIN_MANIFEST = ".claude-plugin/plugin.json";

const installedByClaudeCode =
  (present: readonly Listed[]) =>
  ({ name }: Listed): boolean =>
    PLUGIN_LOCKFILE.test(name) &&
    pipe(
      present,
      Arr.some((entry) => entry.name === join(parent(name))(PLUGIN_MANIFEST)),
    );

export const unneededLockfile =
  (present: readonly Listed[]) =>
  (entry: Listed): boolean =>
    FOREIGN_LOCKFILE.test(entry.name) && !installedByClaudeCode(present)(entry);
