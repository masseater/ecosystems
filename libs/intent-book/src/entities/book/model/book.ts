import {
  Array as Arr,
  Function as Fn,
  Option,
  Order,
  pipe,
  Record as Rec,
  String as Str,
} from "effect";

import type { Skill } from "./skill.ts";

export interface Book {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly repository: Option.Option<string>;
  readonly directory: Option.Option<string>;
  readonly homepage: Option.Option<string>;
  readonly skills: readonly Skill[];
}

export interface Group {
  readonly type: string;
  readonly skills: readonly Skill[];
}

export type Page =
  | { readonly kind: "overview" }
  | { readonly kind: "skill"; readonly name: string }
  | { readonly kind: "source"; readonly name: string }
  | { readonly kind: "reference"; readonly name: string; readonly file: string };

type Skills = Readonly<Record<string, Skill>>;

const TYPE_ORDER: readonly string[] = [
  "lifecycle",
  "core",
  "sub-skill",
  "framework",
  "composition",
  "security",
];

const OTHER = "other";
const MARKDOWN_SUFFIX = /\.md$/u;
const REQUIRE_SEPARATOR = "#";
const NO_DEPTH = 0;
const ONE_LEVEL = 1;
const DATA_FIRST_ARITY = 2;

export const requiredName = (requirement: string): string =>
  pipe(
    requirement,
    Str.split(REQUIRE_SEPARATOR),
    Arr.last,
    Option.getOrElse(Fn.constant(requirement)),
  );

const typeIndex = (type: string): number =>
  pipe(
    TYPE_ORDER,
    Arr.findFirstIndex((known) => known === type),
    Option.getOrElse(Fn.constant(TYPE_ORDER.length)),
  );

const byType: Order.Order<string> = Order.combine(
  Order.mapInput(Order.Number, typeIndex),
  Order.String,
);

const requiredSkills =
  (byName: Skills, seen: readonly string[]) =>
  (skill: Skill): readonly Skill[] =>
    pipe(
      skill.requires,
      Arr.flatMap((requirement) => Option.toArray(Rec.get(byName, requiredName(requirement)))),
      Arr.filter((required) => !Arr.contains(seen, required.name)),
    );

const depth =
  (byName: Skills, seen: readonly string[]) =>
  (skill: Skill): number =>
    pipe(
      skill,
      requiredSkills(byName, seen),
      Arr.map((required) => depth(byName, Arr.append(seen, skill.name))(required) + ONE_LEVEL),
      Arr.prepend(NO_DEPTH),
      Arr.max(Order.Number),
    );

const orderedByDepth = (skills: readonly Skill[]): readonly Skill[] => {
  const byName = Rec.fromIterableBy(skills, (skill) => skill.name);
  const compareDepth = Order.mapInput(Order.Number, depth(byName, []));
  const compareName = Order.mapInput(Order.String, (skill: Skill) => skill.name);
  return Arr.sort(skills, Order.combine(compareDepth, compareName));
};

export const typeOf = (skill: Skill): string => Option.getOrElse(skill.type, Fn.constant(OTHER));

export const groupSkills = (skills: readonly Skill[]): readonly Group[] => {
  const grouped = Arr.groupBy(skills, typeOf);
  return pipe(
    Rec.toEntries(grouped),
    Arr.map(([type, members]) => ({ type, skills: orderedByDepth(members) })),
    Arr.sortBy(Order.mapInput(byType, (group: Group) => group.type)),
  );
};

export const orderedSkills = (groups: readonly Group[]): readonly Skill[] =>
  pipe(
    groups,
    Arr.flatMap((group) => group.skills),
  );

const requiredNames = (skill: Skill): readonly string[] =>
  pipe(skill.requires, Arr.map(requiredName));

export const entrySkills = (skills: readonly Skill[]): readonly Skill[] => {
  const required = pipe(skills, Arr.flatMap(requiredNames));
  return pipe(
    skills,
    Arr.filter(
      (skill) => Arr.isReadonlyArrayEmpty(skill.requires) && Arr.contains(required, skill.name),
    ),
  );
};

const pageRoute = (page: Page): string => {
  switch (page.kind) {
    case "overview": {
      return "";
    }
    case "skill": {
      return `${page.name}/`;
    }
    case "source": {
      return `${page.name}.md`;
    }
    case "reference": {
      return `${page.name}/${Str.replace(MARKDOWN_SUFFIX, "")(page.file)}/`;
    }
    default: {
      return page satisfies never;
    }
  }
};

export const routeOf: {
  (page: Page): (slug: string) => string;
  (slug: string, page: Page): string;
} = Fn.dual(DATA_FIRST_ARITY, (slug: string, page: Page): string => `/${slug}/${pageRoute(page)}`);
