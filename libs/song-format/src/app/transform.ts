import { NodeFileSystem } from "@effect/platform-node-shared";
import { mappedOutput } from "@r_masseater/mapped-import/mapper";
import type { Request } from "@r_masseater/mapped-import/mapper";
import { Effect, FileSystem, ManagedRuntime } from "effect";
import type { TransformResult } from "ts-content-mapper";

import { songModuleOf } from "#/features/build-song-module/index.ts";

const transformSong = Effect.fn("transformSong")(function* transformSong(request: Request) {
  const fileSystem = yield* FileSystem.FileSystem;
  const { mapped } = yield* songModuleOf({
    path: request.fileName,
    content: request.content,
    read: (path) => fileSystem.readFileString(path),
  });
  return mappedOutput({ request, mapped });
});

const runtime = ManagedRuntime.make(NodeFileSystem.layer);

export const transform = (request: Request): Promise<TransformResult> =>
  runtime.runPromise(transformSong(request));
