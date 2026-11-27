import { mustSucceed } from "@r_masseater/github-workflow";
import { Effect, FileSystem, Path } from "effect";

import { widenRangesEnv } from "./widened-ranges.ts";

const TARBALL = "package.tgz";

/** @internal */
export const pack = Effect.fn("publish.pack")(function* pack(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temporary = yield* fileSystem.makeTempDirectoryScoped();
  const tarball = path.join(temporary, TARBALL);
  const env = yield* widenRangesEnv(temporary);
  yield* mustSucceed({
    command: "vp",
    args: ["pm", "pack", "--out", tarball],
    env,
    cwd: directory,
  });
  return tarball;
});
