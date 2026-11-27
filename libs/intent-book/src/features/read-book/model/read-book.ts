import {
  Array as Arr,
  Boolean as Bool,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { Book, Reference, Skill } from "#/entities/book/index.ts";
import { parseSkill } from "#/entities/book/index.ts";

const taggedError = Schema.TaggedError;

export class BookReadError extends taggedError<BookReadError, { readonly brand: unique symbol }>()(
  "BookReadError",
  {
    directory: Schema.String,
    reason: Schema.String,
  },
) {}

const RepositoryObject = Schema.Struct({ url: Schema.String });
const Repository = Schema.Union([Schema.String, RepositoryObject]);

const PackageJson = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  description: Schema.optionalKey(Schema.String),
  homepage: Schema.optionalKey(Schema.String),
  repository: Schema.optionalKey(Repository),
});

type Manifest = typeof PackageJson.Type;

const PackageJsonText = Schema.fromJsonString(PackageJson);
const decodePackageJson = Schema.decodeUnknownEffect(PackageJsonText);

const SKILLS_DIRECTORY = "skills";
const SKILL_FILE = "SKILL.md";
const MANIFEST_FILE = "package.json";
const REFERENCES_DIRECTORY = "references";
const MARKDOWN = ".md";
const ROOT_ENTRY = ".";
const GIT_PREFIX = /^git\+/u;
const GIT_SUFFIX = /\.git$/u;
const SHORTHAND = /^(?:github:)?(?<slug>[\w.-]+\/[\w.-]+)$/u;
const FILE_CONCURRENCY = 16;

const githubSlug = (value: string): Option.Option<string> =>
  pipe(
    value,
    Str.match(SHORTHAND),
    Option.flatMapNullishOr((found) => found.groups),
    Option.flatMap((groups) => Rec.get(groups, "slug")),
  );

const repositoryUrl = (value: string): string =>
  pipe(
    githubSlug(value),
    Option.match({
      onNone: () => pipe(value, Str.replace(GIT_PREFIX, ""), Str.replace(GIT_SUFFIX, "")),
      onSome: (slug) => `https://github.com/${slug}`,
    }),
  );

const repositoryText = (repository: NonNullable<Manifest["repository"]>): string =>
  Match.value(repository).pipe(
    Match.when(Predicate.isString, (text) => text),
    Match.orElse((described) => described.url),
  );

const sortedNames = (names: readonly string[]): readonly string[] =>
  pipe(names, Arr.sortBy(Str.Order));

const readReferences = Effect.fn("readReferences")(function* readReferences(
  skillDirectory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.join(skillDirectory, REFERENCES_DIRECTORY);
  const entries: readonly string[] = yield* fileSystem.exists(directory).pipe(
    Effect.flatMap(
      Bool.match({
        onTrue: () => fileSystem.readDirectory(directory, { recursive: true }),
        onFalse: () => Effect.succeed([]),
      }),
    ),
  );
  const files = pipe(entries, Arr.filter(Str.endsWith(MARKDOWN)), sortedNames);
  return yield* Effect.forEach(
    files,
    (file) =>
      fileSystem
        .readFileString(path.join(directory, file))
        .pipe(Effect.map((text): Reference => ({ file: `${REFERENCES_DIRECTORY}/${file}`, text }))),
    { concurrency: FILE_CONCURRENCY },
  );
});

const readManifest = Effect.fn("readManifest")(function* readManifest(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  return yield* fileSystem.readFileString(path.join(directory, MANIFEST_FILE)).pipe(
    Effect.flatMap(decodePackageJson),
    Effect.mapError((cause) =>
      BookReadError.make({ directory, reason: `${MANIFEST_FILE}: ${cause.message}` }),
    ),
  );
});

const skillNames = Effect.fn("skillNames")(function* skillNames(skillsDirectory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const entries = yield* fileSystem
    .readDirectory(skillsDirectory, { recursive: true })
    .pipe(Effect.orElseSucceed((): readonly string[] => []));
  return pipe(
    entries,
    Arr.filter((entry) => path.basename(entry) === SKILL_FILE),
    Arr.map((entry) => path.dirname(entry)),
    Arr.filter((name) => name !== ROOT_ENTRY),
    sortedNames,
  );
});

const readSkill = Effect.fn("readSkill")(function* readSkill(
  skillsDirectory: string,
  name: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const skillDirectory = path.join(skillsDirectory, name);
  const text = yield* fileSystem.readFileString(path.join(skillDirectory, SKILL_FILE));
  const references = yield* readReferences(skillDirectory);
  return yield* parseSkill({ name, text, references });
});

const readSkills = Effect.fn("readSkills")(function* readSkills(directory: string) {
  const path = yield* Path.Path;
  const skillsDirectory = path.join(directory, SKILLS_DIRECTORY);
  const names = yield* skillNames(skillsDirectory);
  yield* Effect.filterOrFail(Effect.succeed(names), Arr.isReadonlyArrayNonEmpty, () =>
    BookReadError.make({ directory, reason: `no ${SKILL_FILE} under ${SKILLS_DIRECTORY}/` }),
  );
  const skills: readonly Skill[] = yield* Effect.forEach(
    names,
    (name) => readSkill(skillsDirectory, name),
    { concurrency: FILE_CONCURRENCY },
  );
  return skills;
});

/** @internal */
export const readBook = Effect.fn("readBook")(function* readBook(directory: string) {
  const manifest = yield* readManifest(directory);
  const skills = yield* readSkills(directory);
  const book: Book = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description ?? "",
    repository: pipe(
      Option.fromNullishOr(manifest.repository),
      Option.map(repositoryText),
      Option.map(repositoryUrl),
    ),
    homepage: Option.fromNullishOr(manifest.homepage),
    skills,
  };
  return book;
});
