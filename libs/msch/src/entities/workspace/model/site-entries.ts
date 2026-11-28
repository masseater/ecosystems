import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const READ_CONCURRENCY = 16;
const SCRIPT = /\.[cm]?tsx?$/u;
const SKIPPED = /\.test\.|\.d\.[cm]?ts$/u;
const SERVER_ENTRY_IMPORT = /from\s+["']@effect\/ui\/html\/HtmlServerHttp["']/u;

export const siteEntries = Effect.fn("siteEntries")(function* siteEntries(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const candidates = pipe(
    listed,
    Arr.filter((file) => SCRIPT.test(file) && !SKIPPED.test(file)),
  );
  const texts = yield* Effect.forEach(
    candidates,
    (file) => files.readFile(files.join(root, file)),
    { concurrency: READ_CONCURRENCY },
  );
  return pipe(
    Arr.zip(candidates, texts),
    Arr.filter(([, text]) => Option.exists(text, (value) => SERVER_ENTRY_IMPORT.test(value))),
    Arr.map(([file]) => file),
  );
});
