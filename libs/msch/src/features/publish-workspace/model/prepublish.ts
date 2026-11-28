import { mustSucceed } from "@r_masseater/github-workflow";
import { Config, Effect, Option, Schema, String as Str, pipe } from "effect";

const PNPM_AGENT = "pnpm/";

const taggedError = Schema.TaggedError;

/** @internal */
export class PublishedWithoutPnpm extends taggedError<
  PublishedWithoutPnpm,
  { readonly brand: unique symbol }
>()("PublishedWithoutPnpm", { message: Schema.String }) {}

/** @internal */
export const prepublish = Effect.fn("publish.prepublish")(function* prepublish(directory: string) {
  const agent = yield* Config.option(Config.String("npm_config_user_agent"));
  const throughPnpm = pipe(agent, Option.exists(Str.startsWith(PNPM_AGENT)));
  if (!throughPnpm) {
    return yield* PublishedWithoutPnpm.make({
      message:
        "npm publish leaves catalog: in dependencies. Publish the tarball from vp pm pack instead.",
    });
  }
  return yield* mustSucceed({ command: "vp", args: ["run", "build"], cwd: directory });
});
