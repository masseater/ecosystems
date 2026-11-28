import { Context, Effect, Option } from "effect";
import type { Path } from "effect";

import { vpaCacheDirectory } from "#/shared/lib/cache.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

export const SkillCacheDirectory = Context.Reference<Option.Option<string>>(
  "vite-plus-adopt/SkillCacheDirectory",
  { defaultValue: Option.none },
);

/** @internal */
export const skillCacheDirectory: Effect.Effect<string, VpToolsError, Path.Path> = Effect.gen(
  function* skillCache() {
    const configured = yield* SkillCacheDirectory;
    if (Option.isSome(configured)) {
      return configured.value;
    }
    return yield* vpaCacheDirectory("skills");
  },
);
