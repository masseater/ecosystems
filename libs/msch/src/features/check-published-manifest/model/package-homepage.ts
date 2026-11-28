import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

import type { PublishedFile, PublishedManifest } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { problemAtIndex } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "package-homepage";
const BRANCH = "main";
const ROOT_DIRECTORY = ".";
const START = 0;
const KEYS = ['"homepage"', '"repository"', '"name"'] as const;

const RepositoryObject = Schema.Struct({
  url: Schema.String,
  directory: Schema.optional(Schema.String),
});
const decodeRepository = Schema.decodeUnknownOption(RepositoryObject);

const repositoryMissing = (directory: string): string =>
  `Published packages declare \`repository\` as \`{ "type": "git", "url": "git+https://github.com/<owner>/<repository>.git", "directory": "${directory}" }\` so that npm and \`npm repo\` link to the source.`;

const directoryWrong = (directory: string): string =>
  `In a monorepo \`repository.directory\` names the package directory, so npm links to the package and not to the repository root. Set it to "${directory}".`;

const homepageWrong = (homepage: string): string =>
  `\`homepage\` is the link npm shows as the package's home, and the repository root is not the package. Set it to "${homepage}".`;

const repositoryUrlOf = (url: string): string =>
  pipe(url, Str.replace(/^git\+/u, ""), Str.replace(/\.git$/u, ""));

const homepageOf = (url: string, directory: string): string =>
  `${repositoryUrlOf(url)}/tree/${BRANCH}/${directory}#readme`;

const repositoryMessages =
  (manifest: PublishedManifest, directory: string) =>
  (repository: typeof RepositoryObject.Type): readonly string[] => {
    const expected = homepageOf(repository.url, directory);
    const wrongDirectory = directoryWrong(directory);
    const wrongHomepage = homepageWrong(expected);
    return Arr.getSomes([
      Option.liftPredicate(wrongDirectory, () => repository.directory !== directory),
      Option.liftPredicate(wrongHomepage, () => manifest.homepage !== expected),
    ]);
  };

const messagesOf = (manifest: PublishedManifest, directory: string): readonly string[] =>
  pipe(
    decodeRepository(manifest.repository),
    Option.match({
      onNone: () => [repositoryMissing(directory)],
      onSome: repositoryMessages(manifest, directory),
    }),
  );

const firstKeyIndex = (source: string): number =>
  pipe(
    KEYS,
    Arr.findFirst((key) => Str.includes(key)(source)),
    Option.flatMap((key) => Str.indexOf(key)(source)),
    Option.getOrElse(() => START),
  );

/** @internal */
export const homepageProblems =
  (dirname: (name: string) => string) =>
  ({ entry, source, manifest }: PublishedFile): readonly Problem[] =>
    pipe(
      Option.some(dirname(entry.name)),
      Option.filter((directory) => directory !== ROOT_DIRECTORY),
      Option.map((directory) => messagesOf(manifest, directory)),
      Option.getOrElse((): readonly string[] => []),
      Arr.map((message) =>
        problemAtIndex(RULE)(entry.file, source)(firstKeyIndex(source), message),
      ),
    );
