import { Array as Arr, Effect, Option, pipe, Record as Rec, String as Str } from "effect";
import type { Schema } from "effect";
import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { selectAll } from "hast-util-select";
import { toString as textOf } from "mdast-util-to-string";

import type { Book, Skill } from "#/entities/book/index.ts";
import { parseSkill } from "#/entities/book/index.ts";
import type { SiteFile } from "#/shared/lib/site-file.ts";

import { buildSite } from "./build-site.ts";

const SETUP = pipe(
  [
    "---",
    "name: server-setup",
    "description: Create the router.",
    "metadata:",
    "  type: core",
    "  library_version: '11.32.0'",
    "---",
    "",
    "# Server setup",
    "",
    "Start here.",
  ],
  Arr.join("\n"),
);

export const AUTH = pipe(
  [
    "---",
    "name: auth",
    "description: Implement JWT authentication. Use when protecting procedures.",
    "metadata:",
    "  type: composition",
    "  library_version: '11.32.0'",
    "requires:",
    "  - server-setup",
    "sources:",
    "  - trpc/trpc:www/docs/server/authorization.md",
    "  - trpc/trpc:www/docs/**/*.md",
    "---",
    "",
    "# Authorization",
    "",
    "See [setup](../server-setup/SKILL.md) and [CORS](references/client-cors.md#headers).",
    "",
    "## Create context",
    "",
    "```ts",
    "const a = 1",
    "```",
    "",
    "### Cookies",
    "",
    "## Common Mistakes",
    "",
    "### CRITICAL: Throwing in createContext",
    "",
    "Do not.",
  ],
  Arr.join("\n"),
);

const CORS = "# Client CORS\n\n## Headers\n\nSet them.\n";

const authSkill = (): Effect.Effect<Skill, Schema.SchemaError | Error> =>
  parseSkill({
    name: "auth",
    text: AUTH,
    references: [{ file: "references/client-cors.md", text: CORS }],
  });

const book = Effect.gen(function* makeBook() {
  const setup = yield* parseSkill({ name: "server-setup", text: SETUP, references: [] });
  const auth = yield* authSkill();
  const value: Book = {
    name: "@trpc/server",
    version: "11.32.0",
    description: "The server of tRPC.",
    repository: Option.some("https://github.com/trpc/trpc"),
    homepage: Option.none(),
    skills: [setup, auth],
  };
  return value;
});

export const AUTH_PAGE = "trpc-server/auth/index.html";

export const build = (base = "/"): Effect.Effect<readonly SiteFile[], Schema.SchemaError | Error> =>
  Effect.gen(function* built() {
    const value = yield* book;
    return yield* buildSite({ books: [value], base });
  });

export const contentAt =
  (files: readonly SiteFile[]) =>
  (path: string): string =>
    pipe(
      files,
      Arr.findFirst((file) => file.path === path),
      Option.map((file) => file.content),
      Option.getOrElse(() => ""),
    );

export const page =
  (files: readonly SiteFile[]) =>
  (path: string): Root =>
    fromHtml(contentAt(files)(path));

export const textsOf =
  (tree: Root) =>
  (selector: string): readonly string[] =>
    pipe(
      selectAll(selector, tree),
      Arr.map((node) => textOf(node)),
    );

const hrefOf = (node: Element): Option.Option<string> =>
  pipe(Rec.get({ ...node.properties }, "href"), Option.map(String));

export const hrefsOf =
  (tree: Root) =>
  (selector: string): readonly string[] =>
    pipe(selectAll(selector, tree), Arr.map(hrefOf), Arr.getSomes);

export const pathsOf = (files: readonly SiteFile[]): readonly string[] =>
  pipe(
    files,
    Arr.map((file) => file.path),
    Arr.sortBy(Str.Order),
  );
