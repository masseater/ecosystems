import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkCrates } from "./crates.ts";

const survivesMissingMember = Effect.gen(function* survivesMissingMember() {
  const root = yield* gitRepositoryWith({
    "Cargo.toml": '[workspace]\nmembers = ["crates/gone"]\n',
    "package.json": "{}",
    "pnpm-workspace.yaml": "packages:\n  - crates/*\n",
  });
  const problems = yield* checkCrates(root);
  expect(problems).toStrictEqual([]);
});

layer(Layer.mergeAll(nodeServicesLayer, fixtureLayer))("crates", (it) => {
  it.effect(
    "reports nothing instead of failing when cargo cannot read the workspace",
    () => survivesMissingMember,
  );
});
