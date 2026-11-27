import { Array as Arr, Effect, Function as Fn, Option, pipe } from "effect";
import { toString as textOf } from "mdast-util-to-string";

import { routeOf, slugOf } from "#/entities/book/index.ts";
import type { Book } from "#/entities/book/index.ts";
import { renderMarkdown } from "#/shared/lib/render-markdown.ts";
import type { SiteFile } from "#/shared/lib/site-file.ts";

import { documentsOf } from "./documents.ts";
import type { BookContext, Document } from "./documents.ts";
import { fileOf, linkResolver } from "./links.ts";
import { overviewMain } from "./pages.ts";
import { searchText } from "./search-index.ts";
import type { SearchEntryData } from "./search-index.ts";
import { renderShell } from "./shell.ts";

export interface Built {
  readonly files: readonly SiteFile[];
  readonly entries: readonly SearchEntryData[];
}

const INDEX = "index.html";
const RENDER_CONCURRENCY = 8;

const indexFile = (route: string): string => `${fileOf(route)}${INDEX}`;

const renderDocument = Effect.fn("renderDocument")(function* renderDocument(
  context: BookContext,
  document: Document,
) {
  const rendered = yield* renderMarkdown({
    body: document.body,
    resolveLink: context.resolveFrom(document.from),
  });
  const title = Option.getOrElse(rendered.title, Fn.constant(document.fallbackTitle));
  const main = document.main({
    base: context.base,
    book: context.book,
    skill: document.skill,
    title,
    tree: rendered.tree,
  });
  const html = renderShell({
    base: context.base,
    books: context.books,
    book: context.book,
    title,
    description: document.skill.description,
    current: document.current,
    main,
    headings: rendered.headings,
  });
  const entry: SearchEntryData = {
    title,
    name: document.searchName,
    book: context.book.name,
    url: `${context.base}${fileOf(document.route)}`,
    text: searchText({ lead: document.lead, body: textOf(rendered.tree) }),
  };
  const page: SiteFile = { path: indexFile(document.route), content: html };
  const built: Built = { files: [page, document.raw], entries: [entry] };
  return built;
});

const overviewFile = (context: BookContext): SiteFile => ({
  path: indexFile(routeOf(context.slug, { kind: "overview" })),
  content: renderShell({
    base: context.base,
    books: context.books,
    book: context.book,
    title: context.book.name,
    description: context.book.description,
    current: { kind: "overview" },
    main: overviewMain({ base: context.base, book: context.book }),
    headings: [],
  }),
});

export const renderBook = Effect.fn("renderBook")(function* renderBook(input: {
  readonly books: readonly Book[];
  readonly book: Book;
  readonly base: string;
}) {
  const slug = slugOf(input.book.name);
  const context: BookContext = {
    ...input,
    slug,
    resolveFrom: linkResolver({ slug, book: input.book, base: input.base }),
  };
  const documents = pipe(input.book.skills, Arr.flatMap(documentsOf(context)));
  const rendered = yield* Effect.forEach(
    documents,
    (document) => renderDocument(context, document),
    { concurrency: RENDER_CONCURRENCY },
  );
  const files = pipe(
    rendered,
    Arr.flatMap((part) => part.files),
    Arr.append(overviewFile(context)),
  );
  const entries = pipe(
    rendered,
    Arr.flatMap((part) => part.entries),
  );
  const built: Built = { files, entries };
  return built;
});
