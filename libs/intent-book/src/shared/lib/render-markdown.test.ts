import { it } from "@effect/vitest";
import { Effect, Option, pipe, String as Str } from "effect";
import { toHtml } from "hast-util-to-html";
import { expect } from "vite-plus/test";

import type { LinkResolver, MarkdownRenderError, RenderedMarkdown } from "./render-markdown.ts";
import { renderMarkdown } from "./render-markdown.ts";

type HtmlPage = RenderedMarkdown & { readonly html: string };

const html = (
  body: string,
  resolve: LinkResolver = Option.none,
): Effect.Effect<HtmlPage, MarkdownRenderError> =>
  renderMarkdown({ body, resolveLink: resolve }).pipe(
    Effect.map((page) => ({ ...page, html: toHtml(page.tree) })),
  );

it.effect("takes the first H1 as the title and leaves it out of the body", () =>
  Effect.gen(function* title() {
    const page = yield* html("# Authorization\n\nText.\n\n## Setup\n\nMore.");
    expect(page.title).toStrictEqual(Option.some("Authorization"));
    expect(page.html).not.toContain("<h1");
    expect(page.html).toContain('<h2 id="setup">Setup</h2>');
  }),
);

it.effect("lists H2 and H3 headings with the ids the body uses", () =>
  Effect.gen(function* headings() {
    const page = yield* html("# T\n\n## Core Patterns\n\n### Link `to`\n\n#### Deep");
    expect(page.headings).toStrictEqual([
      { depth: 2, id: "core-patterns", text: "Core Patterns" },
      { depth: 3, id: "link-to", text: "Link to" },
    ]);
  }),
);

it.effect("highlights fenced code in a light and a dark theme", () =>
  Effect.gen(function* code() {
    const page = yield* html("# T\n\n```ts\nconst a: number = 1\n```");
    expect(page.html).toContain("--shiki-light");
    expect(page.html).toContain("--shiki-dark");
  }),
);

it.effect("renders a fence with an unknown language as plain text", () =>
  Effect.gen(function* unknownLanguage() {
    const page = yield* html("# T\n\n```nope\nhello\n```");
    expect(page.html).toContain("hello");
  }),
);

it.effect("marks mistakes by the severity word at the start of an H3", () =>
  Effect.gen(function* severity() {
    const page = yield* html(
      "# T\n\n## Common Mistakes\n\n### CRITICAL: Using ===\n\nx\n\n### HIGH Missing await\n\ny\n\n### Plain\n\nz",
    );
    expect(page.html).toContain('data-severity="critical"');
    expect(page.html).toContain('data-severity="high"');
    expect(page.html).toContain('<h3 id="plain">Plain</h3>');
  }),
);

it.effect("rewrites a relative link to a Markdown file through the resolver", () =>
  Effect.gen(function* links() {
    const page = yield* html(
      "# T\n\nSee [adapter](references/query-adapter.md#cancel) and [site](https://example.com).",
      (href) =>
        pipe(
          Option.some("/db/collection-setup/references/query-adapter/#cancel"),
          Option.filter(() => Str.startsWith("references/query-adapter.md")(href)),
        ),
    );
    expect(page.html).toContain('href="/db/collection-setup/references/query-adapter/#cancel"');
    expect(page.html).toContain('href="https://example.com"');
  }),
);

it.effect("drops raw HTML such as generated-file comments", () =>
  Effect.gen(function* raw() {
    const page = yield* html("# T\n\n<!-- Generated from docs -->\n\n<script>x()</script>\n\nText");
    expect(page.html).not.toContain("Generated from docs");
    expect(page.html).not.toContain("<script");
    expect(page.html).toContain("Text");
  }),
);
