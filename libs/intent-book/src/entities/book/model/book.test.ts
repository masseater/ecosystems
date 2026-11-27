import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { entrySkills, groupSkills, orderedSkills, routeOf } from "./book.ts";
import type { Skill } from "./skill.ts";

const skill = (
  name: string,
  type: Option.Option<string>,
  requires: readonly string[] = [],
): Skill => ({
  name,
  description: `${name} description`,
  type,
  framework: Option.none(),
  libraryVersion: Option.none(),
  requires,
  sources: [],
  text: "",
  body: "",
  references: [],
});

const typed = (name: string, type: string, requires: readonly string[] = []): Skill =>
  skill(name, Option.some(type), requires);

const SKILLS: readonly Skill[] = [
  typed("auth", "composition", ["server-setup", "middlewares"]),
  typed("middlewares", "core", ["server-setup"]),
  typed("server-setup", "core"),
  typed("adapter-fetch", "sub-skill", ["server-setup"]),
  typed("odd", "mystery"),
  skill("untyped", Option.none()),
  typed("router", "lifecycle"),
];

const namesOf = (skills: readonly Skill[]): readonly string[] =>
  pipe(
    skills,
    Arr.map((entry) => entry.name),
  );

const typesOf = (skills: readonly Skill[]): readonly string[] =>
  pipe(
    groupSkills(skills),
    Arr.map((group) => group.type),
  );

test("groups follow the documented type order and unknown types come last", () => {
  expect(typesOf(SKILLS)).toStrictEqual([
    "lifecycle",
    "core",
    "sub-skill",
    "composition",
    "mystery",
    "other",
  ]);
});

test("a skill sits after the skills it requires inside its group", () => {
  const core = pipe(
    groupSkills(SKILLS),
    Arr.findFirst((group) => group.type === "core"),
    Option.map((group) => namesOf(group.skills)),
  );
  expect(core).toStrictEqual(Option.some(["server-setup", "middlewares"]));
});

test("the reading order is the groups one after another", () => {
  const ordered = orderedSkills(groupSkills(SKILLS));
  expect(namesOf(ordered)).toStrictEqual([
    "router",
    "server-setup",
    "middlewares",
    "adapter-fetch",
    "auth",
    "odd",
    "untyped",
  ]);
});

test("entry skills are those nobody needs first but others require", () => {
  expect(namesOf(entrySkills(SKILLS))).toStrictEqual(["server-setup"]);
});

test("requires that name a package and a skill match the skill", () => {
  const skills = [typed("a", "core"), typed("b", "core", ["@scope/pkg#a"])];
  expect(namesOf(entrySkills(skills))).toStrictEqual(["a"]);
});

test("routes put each page in its own directory under the book", () => {
  expect(routeOf("trpc-server", { kind: "overview" })).toBe("/trpc-server/");
  expect(routeOf("trpc-server", { kind: "skill", name: "db-core/live-queries" })).toBe(
    "/trpc-server/db-core/live-queries/",
  );
  const reference = routeOf("trpc-server", {
    kind: "reference",
    name: "auth",
    file: "references/client-cors.md",
  });
  expect(reference).toBe("/trpc-server/auth/references/client-cors/");
});
