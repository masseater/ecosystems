import { Array as Arr, Boolean as Bool, pipe, Record as Rec, String as Str } from "effect";
import type { Element } from "hast";
import { h } from "hastscript";

import { groupSkills, routeOf } from "#/entities/book/index.ts";
import type { Book, Group, Skill } from "#/entities/book/index.ts";
import { charset, htmlDocument, when } from "#/shared/lib/html.ts";
import type { Heading } from "#/shared/lib/render-markdown.ts";

import { withBase } from "./links.ts";

export type Current =
  | { readonly kind: "overview" }
  | { readonly kind: "skill"; readonly skill: Skill }
  | { readonly kind: "reference"; readonly skill: Skill; readonly file: string };

export interface Shell {
  readonly base: string;
  readonly books: readonly Book[];
  readonly book: Book;
  readonly title: string;
  readonly description: string;
  readonly current: Current;
  readonly main: readonly Element[];
  readonly headings: readonly Heading[];
}

const ICON_BARS = ["M3 6h18", "M3 12h18", "M3 18h18"];
const ICON_CONTRAST = ["M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z", "M12 3v18"];
const ICON_SIZE = "18";
const SINGLE_BOOK = 1;
const REFERENCES_PREFIX = /^references\//u;
const MARKDOWN_SUFFIX = /\.md$/u;

const stroke = (data: string): Element => h("path", Rec.singleton("d", data));

const icon = (strokes: readonly string[]): Element => {
  const paths = pipe(strokes, Arr.map(stroke));
  return h(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: ICON_SIZE,
      height: ICON_SIZE,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      ariaHidden: "true",
    },
    paths,
  );
};

const currentMark = (active: boolean): Readonly<Record<string, string>> =>
  Bool.match(active, { onTrue: () => ({ ariaCurrent: "page" }), onFalse: () => ({}) });

const overviewRoute = (shell: Shell, book: Book): string =>
  withBase(shell.base)(routeOf(book.name, { kind: "overview" }));

const isCurrentSkill = (current: Current, skill: Skill): boolean =>
  current.kind !== "overview" && current.skill.name === skill.name;

const isActiveSkill = (current: Current, skill: Skill): boolean =>
  current.kind === "skill" && current.skill.name === skill.name;

const isActiveReference = (current: Current, skill: Skill, file: string): boolean =>
  current.kind === "reference" && current.skill.name === skill.name && current.file === file;

const skillLink = (shell: Shell, skill: Skill): Element => {
  const route = routeOf(shell.book.name, { kind: "skill", name: skill.name });
  const mark = currentMark(isActiveSkill(shell.current, skill));
  return h("a", { href: withBase(shell.base)(route), ...mark }, skill.name);
};

const referenceLabel = (file: string): string =>
  pipe(file, Str.replace(REFERENCES_PREFIX, ""), Str.replace(MARKDOWN_SUFFIX, ""));

const referenceLink = (shell: Shell, skill: Skill, file: string): Element => {
  const route = routeOf(shell.book.name, { kind: "reference", name: skill.name, file });
  const mark = currentMark(isActiveReference(shell.current, skill, file));
  return h("a", { href: withBase(shell.base)(route), ...mark }, referenceLabel(file));
};

const referenceList = (shell: Shell, skill: Skill): Element => {
  const items = pipe(
    skill.references,
    Arr.map((reference) => h("li", [referenceLink(shell, skill, reference.file)])),
  );
  return h("ul", { class: "children" }, items);
};

const skillWithReferences = (shell: Shell, skill: Skill): Element => {
  const summary = h("summary", [skillLink(shell, skill)]);
  const open = isCurrentSkill(shell.current, skill);
  return h("li", [h("details", { open }, [summary, referenceList(shell, skill)])]);
};

const skillItem = (shell: Shell, skill: Skill): Element =>
  Bool.match(Arr.isReadonlyArrayEmpty(skill.references), {
    onTrue: () => h("li", [skillLink(shell, skill)]),
    onFalse: () => skillWithReferences(shell, skill),
  });

const bookEntry = (shell: Shell, book: Book): Element =>
  h("li", [h("a", { href: overviewRoute(shell, book) }, book.name)]);

const bookSwitch = (shell: Shell): readonly Element[] => {
  const entries = pipe(
    shell.books,
    Arr.map((book) => bookEntry(shell, book)),
  );
  const summary = h("summary", [h("strong", shell.book.name)]);
  return when(shell.books.length !== SINGLE_BOOK)(() => [
    h("details", { class: "book-switch" }, [summary, h("ul", entries)]),
  ]);
};

const overviewItem = (shell: Shell): Element => {
  const mark = currentMark(shell.current.kind === "overview");
  return h("li", [h("a", { href: overviewRoute(shell, shell.book), ...mark }, "Overview")]);
};

const skillGroup = (shell: Shell, group: Group): Element => {
  const items = pipe(
    group.skills,
    Arr.map((skill) => skillItem(shell, skill)),
  );
  return h("details", { class: "group", open: true }, [h("summary", group.type), h("ul", items)]);
};

const sidebar = (shell: Shell): Element => {
  const groups = pipe(
    groupSkills(shell.book.skills),
    Arr.map((group) => skillGroup(shell, group)),
  );
  return h("nav", { class: "side", ariaLabel: "Skills" }, [
    ...bookSwitch(shell),
    h("ul", [overviewItem(shell)]),
    ...groups,
  ]);
};

const tocEntry = (heading: Heading): Element =>
  h("li", { class: `depth-${heading.depth}` }, [h("a", { href: `#${heading.id}` }, heading.text)]);

const tocList = (headings: readonly Heading[]): Element => {
  const entries = pipe(headings, Arr.map(tocEntry));
  return h("div", [h("h2", "On this page"), h("ul", entries)]);
};

const tableOfContents = (headings: readonly Heading[]): Element =>
  h("aside", { class: "toc", ariaLabel: "On this page" }, [
    Bool.match(Arr.isReadonlyArrayEmpty(headings), {
      onTrue: () => h("span"),
      onFalse: () => tocList(headings),
    }),
  ]);

const iconButton = (
  label: string,
  marker: Readonly<Record<string, string>>,
  glyph: Element,
): Element =>
  h("button", { class: "icon-button", type: "button", ariaLabel: label, ...marker }, [glyph]);

const topBar = (shell: Shell): Element => {
  const brand = h("a", { class: "brand", href: overviewRoute(shell, shell.book) }, [
    shell.book.name,
    h("small", `v${shell.book.version}`),
  ]);
  const search = h("button", { class: "search-open", type: "button", dataSearchOpen: "" }, [
    h("span", "Search"),
    h("kbd", "Ctrl K"),
  ]);
  return h("header", { class: "top" }, [
    iconButton("Toggle navigation", { dataNavToggle: "" }, icon(ICON_BARS)),
    brand,
    h("span", { class: "grow" }),
    search,
    iconButton("Toggle theme", { dataThemeToggle: "" }, icon(ICON_CONTRAST)),
  ]);
};

const searchDialog = (): Element => {
  const input = h("input", {
    type: "search",
    placeholder: "Search skills",
    ariaLabel: "Search skills",
    autocomplete: "off",
  });
  return h("dialog", { class: "search", ariaLabel: "Search" }, [input, h("ul")]);
};

const headOf = (shell: Shell): readonly Element[] => [
  charset(),
  h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
  h("meta", { name: "intent-book-base", content: shell.base }),
  h("meta", { name: "description", content: shell.description }),
  h("title", `${shell.title} · ${shell.book.name}`),
  h("link", { rel: "stylesheet", href: `${shell.base}assets/book.css` }),
  h("script", { src: `${shell.base}assets/book.js`, defer: true }),
];

const layout = (shell: Shell): Element =>
  h("div", { class: "shell" }, [
    sidebar(shell),
    h("main", [h("article", [...shell.main])]),
    tableOfContents(shell.headings),
  ]);

export const renderShell = (shell: Shell): string =>
  htmlDocument({
    head: headOf(shell),
    body: [topBar(shell), layout(shell), searchDialog()],
  });
