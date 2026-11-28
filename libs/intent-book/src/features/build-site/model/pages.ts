import { Array as Arr, Function as Fn, Option, pipe, Record as Rec, String as Str } from "effect";
import type { Element, ElementContent, Root } from "hast";
import { h } from "hastscript";

import {
  entrySkills,
  groupSkills,
  orderedSkills,
  requiredName,
  routeOf,
  typeOf,
} from "#/entities/book/index.ts";
import type { Book, Skill } from "#/entities/book/index.ts";
import { charset, htmlDocument, optional, when } from "#/shared/lib/html.ts";

import { STYLE_PATH } from "./asset-paths.ts";
import { withBase } from "./links.ts";

export interface SkillPage {
  readonly base: string;
  readonly book: Book;
  readonly skill: Skill;
  readonly title: string;
  readonly tree: Root;
}

export interface BookPage {
  readonly base: string;
  readonly book: Book;
}

const SOURCE = /^(?<repository>[^/:\s]+\/[^:\s]+):(?<file>.+)$/u;
const FIRST_SENTENCE = /^.*?[.。](?=\s|$)/u;
const BEHIND = 1;
const AHEAD = 1;
const CRUMB_SEPARATOR = " › ";
const GLOB = "*";

const contentOf = (tree: Root): readonly ElementContent[] =>
  pipe(
    tree.children,
    Arr.filter((node): node is ElementContent => node.type !== "doctype"),
  );

const firstSentence = (description: string): string =>
  pipe(
    description,
    Str.match(FIRST_SENTENCE),
    Option.flatMap(Arr.head),
    Option.getOrElse(Fn.constant(description)),
  );

const prose = (tree: Root): Element => h("div", { class: "prose" }, [...contentOf(tree)]);

const crumbs = (trail: readonly (Element | string)[]): Element => {
  const parts = pipe(trail, Arr.intersperse(CRUMB_SEPARATOR));
  return h("p", { class: "crumbs" }, [...parts]);
};

const skillRoute = (base: string, book: Book, skill: Skill): string =>
  withBase(base)(routeOf(book.name, { kind: "skill", name: skill.name }));

const rawRoute = (base: string, book: Book, skill: Skill): string =>
  withBase(base)(routeOf(book.name, { kind: "source", name: skill.name }));

const sourceLocation = (source: string): Option.Option<string> =>
  pipe(
    source,
    Str.match(SOURCE),
    Option.flatMapNullishOr((found) => found.groups),
    Option.flatMap((groups) =>
      Option.all({ repository: Rec.get(groups, "repository"), file: Rec.get(groups, "file") }),
    ),
    Option.filter(({ file }) => !Str.includes(GLOB)(file)),
    Option.map(({ repository, file }) => `https://github.com/${repository}/blob/HEAD/${file}`),
  );

const sourceItem = (source: string): Element =>
  pipe(
    sourceLocation(source),
    Option.match({
      onNone: () => h("li", [h("code", source)]),
      onSome: (href) => h("li", [h("a", { href }, [h("code", source)])]),
    }),
  );

const neighbourLink =
  (page: BookPage, style: { readonly className: string; readonly label: string }) =>
  (skill: Skill): Element =>
    h("a", { class: style.className, href: skillRoute(page.base, page.book, skill) }, [
      h("small", style.label),
      skill.name,
    ]);

const pager = (base: string, book: Book, skill: Skill): Element => {
  const order = orderedSkills(groupSkills(book.skills));
  const index = pipe(
    order,
    Arr.findFirstIndex((candidate) => candidate.name === skill.name),
  );
  const previous = pipe(
    index,
    Option.flatMap((position) => Arr.get(order, position - BEHIND)),
    optional(neighbourLink({ base, book }, { className: "prev", label: "Previous" })),
  );
  const next = pipe(
    index,
    Option.flatMap((position) => Arr.get(order, position + AHEAD)),
    optional(neighbourLink({ base, book }, { className: "next", label: "Next" })),
  );
  return h("nav", { class: "pager", ariaLabel: "Previous and next skill" }, [...previous, ...next]);
};

const requiredLink = (base: string, book: Book, requirement: string): Element =>
  pipe(
    book.skills,
    Arr.findFirst((candidate) => candidate.name === requiredName(requirement)),
    Option.match({
      onNone: () => h("code", requirement),
      onSome: (target) => h("a", { href: skillRoute(base, book, target) }, target.name),
    }),
  );

const overviewRoute = (base: string, book: Book): string =>
  withBase(base)(routeOf(book.name, { kind: "overview" }));

const bookLink = (base: string, book: Book): Element =>
  h("a", { href: overviewRoute(base, book) }, book.name);

const skillChips = (base: string, book: Book, skill: Skill): Element => {
  const type = pipe(
    skill.type,
    optional((value) => h("span", value)),
  );
  const version = pipe(
    skill.libraryVersion,
    optional((value) => h("span", `v${value}`)),
  );
  const raw = h("a", { href: rawRoute(base, book, skill) }, "SKILL.md");
  return h("div", { class: "chips" }, [...type, ...version, raw]);
};

const requirementItem =
  (base: string, book: Book) =>
  (requirement: string): Element =>
    h("span", [requiredLink(base, book, requirement)]);

const readFirst = (base: string, book: Book, skill: Skill): readonly Element[] =>
  when(!Arr.isReadonlyArrayEmpty(skill.requires))(() => {
    const links = pipe(skill.requires, Arr.map(requirementItem(base, book)));
    return [h("div", { class: "need" }, [h("strong", "Read first"), ...links])];
  });

const sourceSection = (skill: Skill): readonly Element[] =>
  when(!Arr.isReadonlyArrayEmpty(skill.sources))(() => {
    const items = pipe(skill.sources, Arr.map(sourceItem));
    return [h("section", { class: "sources" }, [h("h2", "Sources"), h("ul", items)])];
  });

const articleOf = (
  input: SkillPage,
  trail: readonly (Element | string)[],
  around: { readonly before: readonly Element[]; readonly after: readonly Element[] },
): readonly Element[] => [
  crumbs([bookLink(input.base, input.book), ...trail]),
  h("h1", input.title),
  ...around.before,
  prose(input.tree),
  ...around.after,
];

export const skillMain = (input: SkillPage): readonly Element[] => {
  const { base, book, skill } = input;
  return articleOf(input, [typeOf(skill), skill.name], {
    before: [
      h("p", { class: "lead" }, skill.description),
      skillChips(base, book, skill),
      ...readFirst(base, book, skill),
    ],
    after: [...sourceSection(skill), pager(base, book, skill)],
  });
};

export const referenceMain = (input: SkillPage): readonly Element[] => {
  const { base, book, skill } = input;
  return articleOf(input, [h("a", { href: skillRoute(base, book, skill) }, skill.name)], {
    before: [],
    after: [],
  });
};

const rowLink = (href: string, name: string, description: string): Element =>
  h("li", [
    h("a", { href }, [
      h("span", { class: "name" }, name),
      h("span", { class: "desc" }, description),
    ]),
  ]);

const row =
  (base: string, book: Book) =>
  (skill: Skill): Element =>
    rowLink(skillRoute(base, book, skill), skill.name, firstSentence(skill.description));

const section = (page: BookPage, title: string, skills: readonly Skill[]): readonly Element[] =>
  when(!Arr.isReadonlyArrayEmpty(skills))(() => {
    const rows = pipe(skills, Arr.map(row(page.base, page.book)));
    return [h("h2", title), h("ul", { class: "rows" }, rows)];
  });

const overviewChips = (book: Book): Element => {
  const npm = h("a", { href: `https://www.npmjs.com/package/${book.name}` }, "npm");
  const repository = pipe(
    book.repository,
    optional((href) => h("a", { href }, "repository")),
  );
  return h("div", { class: "chips" }, [
    h("span", `v${book.version}`),
    h("span", `${book.skills.length} skills`),
    npm,
    ...repository,
  ]);
};

const overviewSections = (page: BookPage): readonly Element[] => {
  const entries = entrySkills(page.book.skills);
  const entryNames = pipe(
    entries,
    Arr.map((skill) => skill.name),
  );
  const groups = pipe(
    groupSkills(page.book.skills),
    Arr.flatMap((group) => {
      const rest = pipe(
        group.skills,
        Arr.filter((skill) => !Arr.contains(entryNames, skill.name)),
      );
      return section(page, group.type, rest);
    }),
  );
  return [...section(page, "Start here", entries), ...groups];
};

export const overviewMain = (input: BookPage): readonly Element[] => {
  const { book } = input;
  const lead = when(book.description !== "")(() => [h("p", { class: "lead" }, book.description)]);
  const sections = h("div", { class: "overview" }, [...overviewSections(input)]);
  return [crumbs([book.name]), h("h1", book.name), ...lead, overviewChips(book), sections];
};

const landingRow =
  (base: string) =>
  (book: Book): Element =>
    rowLink(overviewRoute(base, book), book.name, book.description);

const SINGLE_BOOK = 1;

const redirectTarget = (input: {
  readonly base: string;
  readonly books: readonly Book[];
}): Option.Option<string> =>
  pipe(
    input.books,
    Option.liftPredicate((books) => books.length === SINGLE_BOOK),
    Option.flatMap(Arr.head),
    Option.map((only) => overviewRoute(input.base, only)),
  );

export const landingPage = (input: {
  readonly base: string;
  readonly books: readonly Book[];
}): string => {
  const refresh = pipe(
    redirectTarget(input),
    optional((target) => h("meta", { httpEquiv: "refresh", content: `0;url=${target}` })),
  );
  const rows = pipe(input.books, Arr.map(landingRow(input.base)));
  const head = [
    charset(),
    h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
    ...refresh,
    h("title", "Skills"),
    h("link", { rel: "stylesheet", href: `${input.base}${STYLE_PATH}` }),
  ];
  const body = h("main", [h("article", [h("h1", "Skills"), h("ul", { class: "rows" }, rows)])]);
  return htmlDocument({ head, body: [body] });
};
