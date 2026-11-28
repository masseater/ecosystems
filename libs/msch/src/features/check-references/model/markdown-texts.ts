import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const MARKDOWN = ".md";
const FIXTURE = /(?:^|\/)fixtures\//u;
const READ_CONCURRENCY = 16;

/** @internal */
export interface MarkdownText {
  readonly file: string;
  readonly source: string;
}

/** @internal */
export const markdownTexts = Effect.fn("markdownTexts")(function* markdownTexts(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const documents = pipe(
    listed,
    Arr.filter((file) => Str.endsWith(MARKDOWN)(file) && !FIXTURE.test(file)),
    Arr.map((file) => files.join(root, file)),
  );
  const read = yield* Effect.forEach(
    documents,
    (file) =>
      Effect.map(
        files.readFile(file),
        Option.map((source): MarkdownText => ({ file, source })),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(read);
});
