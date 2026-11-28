import { Array as Arr, Boolean as Bool, Effect, pipe } from "effect";

import type { Book } from "#/entities/book/index.ts";
import type { SiteFile } from "#/shared/lib/site-file.ts";

import { ASSET_FILES } from "./assets.ts";
import { landingPage } from "./pages.ts";
import { renderBook } from "./render-book.ts";
import { searchIndexFile } from "./search-index.ts";

const RENDER_CONCURRENCY = 8;

const landingFiles = (input: {
  readonly books: readonly Book[];
  readonly base: string;
  readonly landing: boolean;
}): readonly SiteFile[] =>
  Bool.match(input.landing, {
    onTrue: () => [{ path: "index.html", content: landingPage(input) }],
    onFalse: () => [],
  });

export const buildSite = Effect.fn("buildSite")(function* buildSite(input: {
  readonly books: readonly Book[];
  readonly base: string;
  readonly landing: boolean;
}) {
  const built = yield* Effect.forEach(
    input.books,
    (book) => renderBook({ books: input.books, book, base: input.base }),
    { concurrency: RENDER_CONCURRENCY },
  );
  const entries = pipe(
    built,
    Arr.flatMap((part) => part.entries),
  );
  const search = yield* searchIndexFile(entries);
  const books = pipe(
    built,
    Arr.flatMap((part) => part.files),
  );
  const files: readonly SiteFile[] = [...books, ...landingFiles(input), ...ASSET_FILES, search];
  return files;
});
