import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "./repository-files.ts";

const MANIFEST = /(?:^|\/)package\.json$/u;
const READ_CONCURRENCY = 16;

/** @internal */
export interface ManifestText {
  readonly file: string;
  readonly text: string;
}

/** @internal */
export const manifestTexts = Effect.fn("manifestTexts")(function* manifestTexts(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const names = pipe(
    listed,
    Arr.filter((name) => MANIFEST.test(name)),
  );
  const read = yield* Effect.forEach(
    names,
    (file) =>
      Effect.map(
        files.readFile(files.join(root, file)),
        Option.map((text): ManifestText => ({ file, text })),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(read);
});
