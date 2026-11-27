import { it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { describe, expect } from "vite-plus/test";

import { commitOf } from "./provenance.ts";

const COMMIT = "96fe341bd3d6424ab030d29e0df8ea94ff8d0e31";
const THIS_REPOSITORY = "masseater/ecosystems";

const Json = Schema.fromJsonString(Schema.Unknown);

const statementBuiltIn = (repository: string): unknown => ({
  predicate: {
    buildDefinition: {
      resolvedDependencies: [
        {
          uri: `git+https://github.com/${repository}@refs/heads/main`,
          digest: { gitCommit: COMMIT },
        },
      ],
    },
  },
});

const commitBuiltIn = (
  repository: string,
): Effect.Effect<Option.Option<string>, Schema.SchemaError> =>
  Schema.encodeEffect(Json)(statementBuiltIn(repository)).pipe(
    Effect.map(btoa),
    Effect.flatMap(commitOf(THIS_REPOSITORY)),
  );

const readsOwnCommit = Effect.gen(function* readsOwnCommit() {
  const found = yield* commitBuiltIn(THIS_REPOSITORY);
  expect(found).toStrictEqual(Option.some(COMMIT));
});

const ignoresOtherRepository = Effect.gen(function* ignoresOtherRepository() {
  const found = yield* commitBuiltIn("masseater/masseater.dev");
  expect(found).toStrictEqual(Option.none());
});

describe("provenance commit", () => {
  it.effect("reads the commit built from this repository", () => readsOwnCommit);
  it.effect("ignores a commit built from another repository", () => ignoresOtherRepository);
});
