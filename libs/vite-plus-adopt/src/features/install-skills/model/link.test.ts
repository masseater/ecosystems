import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Array as Arr, Effect, Exit, FileSystem, Option, Path, String as Str, pipe } from "effect";

import { directoryWith, lines } from "#/shared/lib/fixture.test.support.ts";
import type { FixtureServices } from "#/shared/lib/fixture.test.support.ts";

import { linkSkills } from "./link.ts";
import type { Link } from "./link.ts";

const PNPM_LINK = "../../node_modules/.pnpm/kit@1.0.0/node_modules/kit/skills/guide";

const prepare = (
  pnpmName: string,
): Effect.Effect<{ readonly root: string; readonly skills: string }, never, FixtureServices> =>
  Effect.gen(function* prepareRoot() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* directoryWith({
      ".agents/skills/.gitkeep": "",
      ".agents/skills/.gitignore": lines("# pnpm", `/${pnpmName}`, "# pnpm end"),
      "cache/alpha/SKILL.md": "alpha\n",
      "cache/beta/SKILL.md": "beta\n",
    });
    const skills = path.join(root, ".agents", "skills");
    yield* fs.symlink(PNPM_LINK, path.join(skills, pnpmName)).pipe(Effect.orDie);
    return { root, skills };
  });

const link = (root: string, name: string): Link => ({
  name,
  target: `${root}/cache/${name}`,
});

const names = (skills: string): Effect.Effect<readonly string[], never, FileSystem.FileSystem> =>
  FileSystem.FileSystem.pipe(
    Effect.flatMap((fs) => fs.readDirectory(skills)),
    Effect.map((found) => Arr.sort(found, Str.Order)),
    Effect.orDie,
  );

const keepsWhatPnpmLinked = Effect.gen(function* keepsWhatPnpmLinked() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { root, skills } = yield* prepare("guide");
  yield* linkSkills(root)([link(root, "alpha"), link(root, "beta")]);
  const linked = yield* names(skills);
  deepStrictEqual(linked, [".gitignore", ".gitkeep", "alpha", "beta", "guide"]);
  const kept = yield* fs.readLink(path.join(skills, "guide"));
  strictEqual(kept, PNPM_LINK);
  const ignore = yield* fs.readFileString(path.join(skills, ".gitignore"));
  assertTrue(Str.includes("/guide")(ignore));
});

const dropsUndeclaredLinksBesidePnpm = Effect.gen(function* dropsUndeclaredLinksBesidePnpm() {
  const { root, skills } = yield* prepare("guide");
  yield* linkSkills(root)([link(root, "alpha"), link(root, "beta")]);
  yield* linkSkills(root)([link(root, "beta")]);
  const linked = yield* names(skills);
  deepStrictEqual(linked, [".gitignore", ".gitkeep", "beta", "guide"]);
});

const failsWhenPnpmTookTheName = Effect.gen(function* failsWhenPnpmTookTheName() {
  const { root } = yield* prepare("alpha");
  const exit = yield* linkSkills(root)([link(root, "alpha")]).pipe(Effect.exit);
  const namesIt = pipe(
    Exit.findErrorOption(exit),
    Option.exists(({ message }) => Str.includes("pnpm already links alpha")(message)),
  );
  assertTrue(namesIt);
});

layer(fixtureLayer)("linking skills beside pnpm", (it) => {
  it.effect("keeps the links and the ignore block that pnpm wrote", () =>
    Effect.scoped(keepsWhatPnpmLinked),
  );
  it.effect("still removes undeclared links", () => Effect.scoped(dropsUndeclaredLinksBesidePnpm));
  it.effect("fails when pnpm already links a declared name", () =>
    Effect.scoped(failsWhenPnpmTookTheName),
  );
});
