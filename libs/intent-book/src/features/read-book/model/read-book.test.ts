import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, Option, Path, pipe, Schema } from "effect";
import { expect } from "vite-plus/test";

import { BookReadError, readBook } from "./read-book.ts";

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const skillText = (name: string): string =>
  `---\nname: ${name}\ndescription: Use when ${name}.\nmetadata:\n  type: core\n---\n\n# ${name}\n`;

const write = Effect.fn("write")(function* write(root: string, file: string, text: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = path.join(root, file);
  yield* fileSystem.makeDirectory(path.dirname(target), { recursive: true });
  yield* fileSystem.writeFileString(target, text);
});

const writeManifest = Effect.fn("writeManifest")(function* writeManifest(
  root: string,
  extra: Readonly<Record<string, unknown>>,
) {
  const manifest = { name: "@scope/pkg", version: "1.2.3", description: "A package", ...extra };
  const text = yield* encodeJson(manifest);
  yield* write(root, "package.json", text);
});

const tempRoot = Effect.gen(function* tempRoot() {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped();
});

const nameOf = (skill: { readonly name: string }): string => skill.name;

const namesOf = (book: {
  readonly skills: readonly { readonly name: string }[];
}): readonly string[] => pipe(book.skills, Arr.map(nameOf));

const writeSkills = Effect.fn("writeSkills")(function* writeSkills(root: string) {
  yield* write(root, "skills/alpha/SKILL.md", skillText("alpha"));
  yield* write(root, "skills/alpha/references/deep.md", "# Deep\n");
  yield* write(root, "skills/group/SKILL.md", skillText("group"));
  yield* write(root, "skills/group/child/SKILL.md", skillText("child"));
  yield* write(root, "skills/group/notes.txt", "not a skill");
});

const readsNestedSkills = Effect.gen(function* readsNestedSkills() {
  const root = yield* tempRoot;
  yield* writeManifest(root, {
    repository: { type: "git", url: "git+https://github.com/o/r.git" },
  });
  yield* writeSkills(root);
  const book = yield* readBook(root);
  const alpha = pipe(
    book.skills,
    Arr.findFirst((skill) => skill.name === "alpha"),
  );
  expect(book.repository).toStrictEqual(Option.some("https://github.com/o/r"));
  expect(book.description).toBe("A package");
  expect(namesOf(book)).toStrictEqual(["alpha", "group", "group/child"]);
  const references = pipe(
    alpha,
    Option.map((skill) => skill.references),
  );
  expect(references).toStrictEqual(Option.some([{ file: "references/deep.md", text: "# Deep\n" }]));
}).pipe(Effect.scoped);

const readsShorthand = Effect.gen(function* readsShorthand() {
  const root = yield* tempRoot;
  yield* writeManifest(root, { repository: "github:o/r" });
  yield* write(root, "skills/alpha/SKILL.md", skillText("alpha"));
  const book = yield* readBook(root);
  expect(book.repository).toStrictEqual(Option.some("https://github.com/o/r"));
}).pipe(Effect.scoped);

const failsWithoutSkills = Effect.gen(function* failsWithoutSkills() {
  const root = yield* tempRoot;
  yield* writeManifest(root, {});
  const failure = yield* readBook(root).pipe(Effect.flip);
  expect(failure).toBeInstanceOf(BookReadError);
}).pipe(Effect.scoped);

const failsOnMalformedSkill = Effect.gen(function* failsOnMalformedSkill() {
  const root = yield* tempRoot;
  yield* writeManifest(root, {});
  yield* write(root, "skills/bad/SKILL.md", "no frontmatter");
  const failure = yield* readBook(root).pipe(Effect.flip);
  expect(failure).toMatchObject({ skill: "bad" });
}).pipe(Effect.scoped);

const writeMarkdownSkills = Effect.fn("writeMarkdownSkills")(function* writeMarkdownSkills(
  root: string,
) {
  yield* writeManifest(root, {
    repository: { type: "git", url: "git+https://github.com/o/r.git", directory: "packages/pkg" },
  });
  yield* write(root, "skills/alpha/SKILL.md", skillText("alpha"));
  yield* write(root, "skills/alpha/notes.md", "# Notes\n");
  yield* write(root, "skills/alpha/scripts/guide.md", "# Guide\n");
  yield* write(root, "skills/alpha/scripts/run.sh", "echo\n");
  yield* write(root, "skills/alpha/inner/SKILL.md", skillText("inner"));
  yield* write(root, "skills/alpha/inner/own.md", "# Own\n");
  yield* write(root, "skills/_artifacts/skill_spec.md", "# Spec\n");
});

const readsEveryMarkdownOfASkill = Effect.gen(function* readsEveryMarkdownOfASkill() {
  const root = yield* tempRoot;
  yield* writeMarkdownSkills(root);
  const book = yield* readBook(root);
  const filesOf = (name: string): readonly string[] =>
    pipe(
      book.skills,
      Arr.filter((skill) => skill.name === name),
      Arr.flatMap((skill) => skill.references),
      Arr.map((reference) => reference.file),
    );
  expect(namesOf(book)).toStrictEqual(["alpha", "alpha/inner"]);
  expect(filesOf("alpha")).toStrictEqual(["notes.md", "scripts/guide.md"]);
  expect(filesOf("alpha/inner")).toStrictEqual(["own.md"]);
  expect(book.directory).toStrictEqual(Option.some("packages/pkg"));
}).pipe(Effect.scoped);

layer(nodeServices)("readBook", (it) => {
  it.effect(
    "reads every Markdown file of a skill except nested skills and _artifacts",
    () => readsEveryMarkdownOfASkill,
  );
  it.effect("reads a package, its skills, nested skills and references", () => readsNestedSkills);
  it.effect("accepts a repository written as a shorthand", () => readsShorthand);
  it.effect("fails when the package ships no skills", () => failsWithoutSkills);
  it.effect("fails with the skill name when a SKILL.md is malformed", () => failsOnMalformedSkill);
});
