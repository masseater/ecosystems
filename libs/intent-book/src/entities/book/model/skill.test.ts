import { it } from "@effect/vitest";
import { Array as Arr, Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { parseSkill, SkillFormatError } from "./skill.ts";

const LINE = "\n";

const NESTED = Arr.join(
  [
    "---",
    "name: auth",
    "description: >-",
    "  Implement JWT authentication.",
    "  Use when protecting procedures.",
    "metadata:",
    "  type: composition",
    "  library: trpc",
    "  library_version: '11.32.0'",
    "requires:",
    "  - server-setup",
    "  - middlewares",
    "sources:",
    "  - trpc/trpc:www/docs/server/authorization.md",
    "---",
    "",
    "# Authorization",
    "",
    "Body text.",
  ],
  LINE,
);

const LEGACY = Arr.join(
  [
    "---",
    "name: db-core",
    "description: >",
    "  TanStack DB core concepts.",
    "type: core",
    "library: db",
    "library_version: 0.6.17",
    "---",
    "",
    "# Core",
  ],
  LINE,
);

it.effect("reads the Intent fields under metadata", () =>
  Effect.gen(function* nested() {
    const skill = yield* parseSkill({ name: "auth", text: NESTED, references: [] });
    expect(skill).toMatchObject({
      name: "auth",
      description: "Implement JWT authentication. Use when protecting procedures.",
      type: Option.some("composition"),
      libraryVersion: Option.some("11.32.0"),
      requires: ["server-setup", "middlewares"],
      sources: ["trpc/trpc:www/docs/server/authorization.md"],
    });
    expect(skill.body).toBe("\n# Authorization\n\nBody text.");
  }),
);

it.effect("reads the older top-level type and library_version", () =>
  Effect.gen(function* legacy() {
    const skill = yield* parseSkill({ name: "db-core", text: LEGACY, references: [] });
    expect(skill).toMatchObject({
      type: Option.some("core"),
      libraryVersion: Option.some("0.6.17"),
      requires: [],
      sources: [],
    });
  }),
);

it.effect("keeps the directory path as the name when the frontmatter name differs", () =>
  Effect.gen(function* nestedName() {
    const skill = yield* parseSkill({
      name: "db-core/live-queries",
      text: NESTED,
      references: [],
    });
    expect(skill.name).toBe("db-core/live-queries");
  }),
);

it.effect("fails with the skill name when the frontmatter is missing", () =>
  Effect.gen(function* missing() {
    const failure = yield* parseSkill({
      name: "bare",
      text: "# Only a body",
      references: [],
    }).pipe(Effect.flip);
    expect(failure).toBeInstanceOf(SkillFormatError);
    expect(failure.skill).toBe("bare");
  }),
);

it.effect("fails when the description is missing", () =>
  Effect.gen(function* noDescription() {
    const failure = yield* parseSkill({
      name: "bad",
      text: "---\nname: bad\n---\n\n# Bad",
      references: [],
    }).pipe(Effect.flip);
    expect(failure.skill).toBe("bad");
  }),
);
