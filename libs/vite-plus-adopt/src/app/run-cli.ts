import { runMainWith } from "@r_masseater/node-main";
import { Cause, Layer, Option, Schema, pipe } from "effect";
import type { Effect, Stdio } from "effect";

import type { CommandServices } from "#/shared/lib/command.ts";
import { VpToolsError } from "#/shared/lib/errors.ts";
import { writeTo } from "#/shared/lib/output.ts";

const reportFailure = <Failure>(
  cause: Cause.Cause<Failure>,
): Effect.Effect<void, never, Stdio.Stdio> => {
  const message = pipe(
    Cause.findErrorOption(cause),
    Option.filter(Schema.is(VpToolsError)),
    Option.match({
      onNone: () => Cause.pretty(cause),
      onSome: (error) => error.message,
    }),
  );
  return writeTo("stderr", `${message}\n`);
};

/** @internal */
export const runCli = <Failure>(program: Effect.Effect<void, Failure, CommandServices>): void => {
  runMainWith({
    serviceName: "vpa",
    services: Layer.empty,
    onFailure: reportFailure,
  })(program);
};
