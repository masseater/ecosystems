import { it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";
import { expect } from "vite-plus/test";

import { cacheRootEffect } from "./cache.ts";
import type { CacheRootError } from "./cache.ts";

const rootIn = (
  env: Readonly<Record<string, string>>,
  segments: readonly string[],
): Effect.Effect<string, CacheRootError> =>
  Effect.provideService(
    cacheRootEffect(segments),
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromEnv({ env }),
  );

it.effect("the folder is under XDG_CACHE_HOME when it is set", () =>
  Effect.gen(function* underCacheHome() {
    const root = yield* rootIn({ XDG_CACHE_HOME: "/cache", HOME: "/home/user" }, [
      "plamo-ja",
      "runtime",
    ]);
    expect(root).toBe("/cache/plamo-ja/runtime");
  }),
);

it.effect("the folder is under HOME/.cache when XDG_CACHE_HOME is unset or empty", () =>
  Effect.gen(function* underHome() {
    const unset = yield* rootIn({ HOME: "/home/user" }, ["tool"]);
    const empty = yield* rootIn({ XDG_CACHE_HOME: "", HOME: "/home/user" }, ["tool"]);
    expect(unset).toBe("/home/user/.cache/tool");
    expect(empty).toBe("/home/user/.cache/tool");
  }),
);

it.effect("USERPROFILE stands in for HOME where HOME is unset", () =>
  Effect.gen(function* underProfile() {
    const root = yield* rootIn({ USERPROFILE: String.raw`C:\Users\me` }, ["tool"]);
    expect(root).toBe(String.raw`C:\Users\me/.cache/tool`);
  }),
);

it.effect("it fails when no base folder can be found", () =>
  Effect.gen(function* nowhere() {
    const failure = yield* Effect.flip(rootIn({}, ["tool"]));
    expect(failure.message).toBe("set XDG_CACHE_HOME or HOME");
  }),
);
