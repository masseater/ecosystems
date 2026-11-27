import { Array as Arr, pipe, String as Str } from "effect";
import type { Element } from "hast";

import { routeOf } from "#/entities/book/index.ts";
import type { Book, Skill } from "#/entities/book/index.ts";
import type { LinkResolver } from "#/shared/lib/render-markdown.ts";
import type { SiteFile } from "#/shared/lib/site-file.ts";

import { fileOf, referencePath, sourcePath } from "./links.ts";
import { referenceMain, skillMain } from "./pages.ts";
import type { SkillPage } from "./pages.ts";
import type { Current } from "./shell.ts";

export interface BookContext {
  readonly books: readonly Book[];
  readonly book: Book;
  readonly slug: string;
  readonly base: string;
  readonly resolveFrom: (document: string) => LinkResolver;
}

export interface Document {
  readonly skill: Skill;
  readonly body: string;
  readonly from: string;
  readonly fallbackTitle: string;
  readonly current: Current;
  readonly route: string;
  readonly main: (input: SkillPage) => readonly Element[];
  readonly raw: SiteFile;
  readonly searchName: string;
  readonly lead: string;
}

type Reference = Skill["references"][number];

const MARKDOWN_SUFFIX = /\.md$/u;

const skillDocument = (context: BookContext, skill: Skill): Document => ({
  skill,
  body: skill.body,
  from: sourcePath(skill),
  fallbackTitle: skill.name,
  current: { kind: "skill", skill },
  route: routeOf(context.slug, { kind: "skill", name: skill.name }),
  main: skillMain,
  raw: {
    path: fileOf(routeOf(context.slug, { kind: "source", name: skill.name })),
    content: skill.text,
  },
  searchName: skill.name,
  lead: skill.description,
});

const referenceDocument =
  (context: BookContext, skill: Skill) =>
  (reference: Reference): Document => {
    const path = referencePath({ skill, file: reference.file });
    return {
      skill,
      body: reference.text,
      from: path,
      fallbackTitle: Str.replace(MARKDOWN_SUFFIX, "")(reference.file),
      current: { kind: "reference", skill, file: reference.file },
      route: routeOf(context.slug, { kind: "reference", name: skill.name, file: reference.file }),
      main: referenceMain,
      raw: { path: `${context.slug}/${path}`, content: reference.text },
      searchName: path,
      lead: "",
    };
  };

export const documentsOf =
  (context: BookContext) =>
  (skill: Skill): readonly Document[] => {
    const references = pipe(skill.references, Arr.map(referenceDocument(context, skill)));
    return Arr.prepend(references, skillDocument(context, skill));
  };
