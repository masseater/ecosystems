import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Result,
  String as Str,
  pipe,
} from "effect";

import type { Rendered, RenderRequest } from "#/entities/figure/model/request.ts";
import { compileFigure } from "#/features/render-figure/model/render.ts";
import type { Mounted } from "#/features/render-figure/model/render.ts";
import type { RenderError } from "#/shared/lib/errors.ts";
import { failWith } from "#/shared/lib/errors.ts";

const ICON_FOLDER = "outlined";
const PARTS_MOUNT = ".kata";
const ICONS_MOUNT = "icons";
const PARTS_EXTENSION = ".typ";
const WORD_GROUP = "word";
const QUOTED_WORD = /"(?<word>[a-z0-9_]+)"/gv;
const SEQUENTIAL = { concurrency: 1 } as const;

type Services = FileSystem.FileSystem | Path.Path;

const folderContaining = (resolved: string): Effect.Effect<string, RenderError, Path.Path> =>
  Effect.gen(function* resolveFolder() {
    const path = yield* Path.Path;
    const file = yield* path.fromFileUrl(new URL(resolved));
    return path.dirname(file);
  }).pipe(Effect.mapError(failWith));

const quotedWords = (source: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(QUOTED_WORD)(source)),
    Arr.filterMap((match) =>
      pipe(
        Option.fromNullishOr(match.groups),
        Option.flatMap((groups) => Option.fromNullishOr(groups[WORD_GROUP])),
        Option.match({ onNone: () => Result.fail(match), onSome: Result.succeed }),
      ),
    ),
    Arr.dedupe,
  );

const readInto = (
  from: string,
  to: string,
): Effect.Effect<Mounted, RenderError, FileSystem.FileSystem> =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fileSystem) => fileSystem.readFile(from)),
    Effect.mapBoth({ onSuccess: (content) => ({ path: to, content }), onFailure: failWith }),
  );

const mountParts = (root: string): Effect.Effect<readonly Mounted[], RenderError, Services> =>
  Effect.gen(function* mountPartFiles() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const partsFolder = yield* folderContaining(
      import.meta.resolve("@r_masseater/kata/typ/theme.typ"),
    );
    const names = yield* fileSystem.readDirectory(partsFolder).pipe(Effect.mapError(failWith));
    return yield* Effect.forEach(
      pipe(
        names,
        Arr.filter((name): boolean => Str.endsWith(PARTS_EXTENSION)(name)),
      ),
      (name) => readInto(path.join(partsFolder, name), path.join(root, PARTS_MOUNT, name)),
      SEQUENTIAL,
    );
  });

const mountIcons = (
  source: string,
  root: string,
): Effect.Effect<readonly Mounted[], RenderError, Services> =>
  Effect.gen(function* mountIconFiles() {
    const path = yield* Path.Path;
    const packageFolder = yield* folderContaining(
      import.meta.resolve("@material-symbols/svg-400/package.json"),
    );
    const found = yield* Effect.forEach(
      quotedWords(source),
      (word) =>
        readInto(
          path.join(packageFolder, ICON_FOLDER, `${word}.svg`),
          path.join(root, PARTS_MOUNT, ICONS_MOUNT, `${word}.svg`),
        ).pipe(Effect.option),
      SEQUENTIAL,
    );
    return Arr.getSomes(found);
  });

const renderWithServices = (
  request: RenderRequest,
): Effect.Effect<Rendered, RenderError, Services> =>
  Effect.gen(function* renderInApp() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = path.resolve(request.file);
    const root = path.dirname(file);
    const source = yield* fileSystem.readFileString(file).pipe(Effect.mapError(failWith));
    const parts = yield* mountParts(root);
    const icons = yield* mountIcons(source, root);
    return yield* compileFigure({ ...request, file, root, mounted: Arr.appendAll(parts, icons) });
  });

export const renderFigure = (request: RenderRequest): Promise<Rendered> =>
  Effect.runPromise(renderWithServices(request).pipe(Effect.provide(nodeServices)));
