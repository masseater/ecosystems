import { Effect, Layer, Option } from "effect";
import type { Stdio } from "effect";
import { FetchHttpClient } from "effect/http";

import { installSkills } from "#/features/install-skills/index.ts";
import { installTools } from "#/features/install-tools/index.ts";
import type { CommandEffect } from "#/shared/lib/command.ts";
import { writeTo } from "#/shared/lib/output.ts";

const reportLinked =
  (what: string, destination: string) =>
  (count: Option.Option<number>): Effect.Effect<void, never, Stdio.Stdio> =>
    Option.match(count, {
      onNone: () => Effect.void,
      onSome: (linked) => writeTo("stdout", `Linked ${linked} ${what} into ${destination}\n`),
    });

/** @internal */
export const prepare = (root: string): CommandEffect =>
  Layer.build(FetchHttpClient.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(
        Effect.gen(function* prepareAll() {
          const skills = yield* installSkills(root);
          yield* reportLinked("skills", ".agents/skills")(skills);
          const tools = yield* installTools(root);
          yield* reportLinked("tools", "node_modules/.bin")(tools);
        }),
        context,
      ),
    ),
    Effect.scoped,
  );
