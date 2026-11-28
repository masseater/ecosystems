import { it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe, Schema, String as Str } from "effect";
import { select, selectAll } from "hast-util-select";
import { toString as textOf } from "mdast-util-to-string";
import { expect } from "vite-plus/test";

import {
  AUTH,
  AUTH_PAGE,
  build,
  contentAt,
  hrefsOf,
  page,
  pathsOf,
  textsOf,
} from "./build-site.test.support.ts";

const IndexEntry = Schema.Struct({
  title: Schema.String,
  name: Schema.String,
  book: Schema.String,
  url: Schema.String,
  text: Schema.String,
});

const decodeIndex = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(IndexEntry)));

const SOURCE_ITEMS = 2;
const LINKED_SOURCES = 1;

it.effect("writes a page per overview, skill and reference, plus raw files and assets", () =>
  Effect.gen(function* paths() {
    const files = yield* build();
    expect(pathsOf(files)).toStrictEqual([
      "@trpc/server/auth.md",
      "@trpc/server/auth/index.html",
      "@trpc/server/auth/references/client-cors.md",
      "@trpc/server/auth/references/client-cors/index.html",
      "@trpc/server/index.html",
      "@trpc/server/server-setup.md",
      "@trpc/server/server-setup/index.html",
      "assets/book.css",
      "assets/book.js",
      "assets/search.json",
      "index.html",
    ]);
  }),
);

it.effect("serves the SKILL.md the agent reads unchanged next to the page", () =>
  Effect.gen(function* raw() {
    const files = yield* build();
    expect(contentAt(files)("@trpc/server/auth.md")).toBe(AUTH);
  }),
);

it.effect("shows the title, the description as the lead and the Intent fields as chips", () =>
  Effect.gen(function* head() {
    const files = yield* build();
    const tree = page(files)(AUTH_PAGE);
    expect(textOf(select("main h1", tree))).toBe("Authorization");
    expect(textOf(select("main .lead", tree))).toBe(
      "Implement JWT authentication. Use when protecting procedures.",
    );
    expect(textsOf(tree)("main .chips span")).toStrictEqual(["composition", "v11.32.0"]);
    expect(select("main .chips a[href='/@trpc/server/auth.md']", tree)).toBeDefined();
  }),
);

it.effect("links the skills it requires under Read first", () =>
  Effect.gen(function* need() {
    const files = yield* build();
    const tree = page(files)(AUTH_PAGE);
    expect(textOf(select("main .need strong", tree))).toBe("Read first");
    expect(select("main .need a[href='/@trpc/server/server-setup/']", tree)).toBeDefined();
  }),
);

it.effect("rewrites links between skill files and to references", () =>
  Effect.gen(function* links() {
    const files = yield* build();
    const tree = page(files)(AUTH_PAGE);
    const reference = "main .prose a[href='/@trpc/server/auth/references/client-cors/#headers']";
    expect(select("main .prose a[href='/@trpc/server/server-setup/']", tree)).toBeDefined();
    expect(select(reference, tree)).toBeDefined();
  }),
);

it.effect("lists the headings of the page and marks the current skill in the sidebar", () =>
  Effect.gen(function* navigation() {
    const files = yield* build();
    const tree = page(files)(AUTH_PAGE);
    expect(textsOf(tree)(".toc a")).toStrictEqual([
      "Create context",
      "Cookies",
      "Common Mistakes",
      "CRITICAL: Throwing in createContext",
    ]);
    expect(textOf(select(".side a[aria-current='page']", tree))).toBe("auth");
    expect(select(".side details.group", tree)).toBeDefined();
  }),
);

it.effect("links each source file in its repository and leaves globs as text", () =>
  Effect.gen(function* sources() {
    const files = yield* build();
    const tree = page(files)(AUTH_PAGE);
    const linked =
      ".sources a[href='https://github.com/trpc/trpc/blob/HEAD/www/docs/server/authorization.md']";
    expect(select(linked, tree)).toBeDefined();
    expect(selectAll(".sources li", tree)).toHaveLength(SOURCE_ITEMS);
    expect(selectAll(".sources a", tree)).toHaveLength(LINKED_SOURCES);
  }),
);

it.effect("links the previous and next skill in reading order", () =>
  Effect.gen(function* pager() {
    const files = yield* build();
    const auth = page(files)(AUTH_PAGE);
    const setup = page(files)("@trpc/server/server-setup/index.html");
    expect(select(".pager a.prev[href='/@trpc/server/server-setup/']", auth)).toBeDefined();
    expect(select(".pager a.next", auth)).toBeUndefined();
    expect(select(".pager a.next[href='/@trpc/server/auth/']", setup)).toBeDefined();
  }),
);

it.effect("shows the entry skills first and the other skills by group on the book overview", () =>
  Effect.gen(function* overview() {
    const files = yield* build();
    const tree = page(files)("@trpc/server/index.html");
    expect(textOf(select("main h1", tree))).toBe("@trpc/server");
    expect(textOf(select("main .lead", tree))).toBe("The server of tRPC.");
    expect(textsOf(tree)("main h2")).toStrictEqual(["Start here", "composition"]);
    expect(hrefsOf(tree)("main .rows a")).toStrictEqual([
      "/@trpc/server/server-setup/",
      "/@trpc/server/auth/",
    ]);
  }),
);

it.effect("prefixes every link and asset with the base path", () =>
  Effect.gen(function* based() {
    const files = yield* build("/docs/");
    const tree = page(files)(AUTH_PAGE);
    expect(select("link[href='/docs/assets/book.css']", tree)).toBeDefined();
    expect(select("meta[name='intent-book-base'][content='/docs/']", tree)).toBeDefined();
    expect(select(".side a[href='/docs/@trpc/server/server-setup/']", tree)).toBeDefined();
    expect(select("main .prose a[href='/docs/@trpc/server/server-setup/']", tree)).toBeDefined();
  }),
);

it.effect("indexes every page for search with its title, headings and url", () =>
  Effect.gen(function* search() {
    const files = yield* build();
    const entries = yield* decodeIndex(contentAt(files)("assets/search.json"));
    const auth = pipe(
      entries,
      Arr.findFirst((entry) => entry.url === "/@trpc/server/auth/"),
    );
    const urls = pipe(
      entries,
      Arr.map((entry) => entry.url),
    );
    const labels = pipe(
      auth,
      Option.map((entry) => [entry.title, entry.name, entry.book]),
    );
    const mentions = pipe(
      auth,
      Option.map((entry) => Str.includes("Create context")(entry.text)),
    );
    expect(labels).toStrictEqual(Option.some(["Authorization", "auth", "@trpc/server"]));
    expect(mentions).toStrictEqual(Option.some(true));
    expect(urls).toContain("/@trpc/server/auth/references/client-cors/");
  }),
);

it.effect("sends the root to the book when there is only one", () =>
  Effect.gen(function* landing() {
    const files = yield* build();
    const tree = page(files)("index.html");
    const refresh = "meta[http-equiv='refresh'][content='0;url=/@trpc/server/']";
    expect(select(refresh, tree)).toBeDefined();
  }),
);

it.effect(
  "links files that are not pages to the same repository, under the package directory",
  () =>
    Effect.gen(function* repositoryFiles() {
      const files = yield* build();
      const tree = page(files)(AUTH_PAGE);
      const root = "https://github.com/trpc/trpc/blob/HEAD/packages/server";
      expect(hrefsOf(tree)("main .prose a")).toStrictEqual([
        "/@trpc/server/server-setup/",
        "/@trpc/server/auth/references/client-cors/#headers",
        `${root}/skills/auth/scripts/check.sh`,
        `${root}/skills/_artifacts/skill_spec.md#why`,
        `${root}/README.md`,
      ]);
    }),
);
