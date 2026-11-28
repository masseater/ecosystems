# @r_masseater/github-workflow

Helpers for GitHub Actions steps written with Effect: call the GitHub API of the repository the workflow runs in, write step outputs and annotations, and run commands.

It requires Node.js 26 or later. `effect` is a peer dependency, so your step and this package share one copy of Effect.

```sh
vp add @r_masseater/github-workflow effect
```

## Call the GitHub API

The repository comes from `GITHUB_REPOSITORY`. The token comes from `GH_TOKEN`, or from `GITHUB_TOKEN` when `GH_TOKEN` is not set. Paths are relative to `/repos/<repository>/`.

```ts
import { getJson, post } from "@r_masseater/github-workflow";
import { Effect, Schema } from "effect";

const Label = Schema.Struct({ name: Schema.String });

const labels = getJson(Schema.Array(Label))("issues/1/labels");
const comment = post({ path: "issues/1/comments", body: { body: "done" } });

export const program = Effect.gen(function* run() {
  const current = yield* labels;
  if (current.length === 0) {
    yield* comment;
  }
});
```

`getJson` decodes the response with a schema. `postJson` does the same for a POST. `post`, `patch` and `remove` ignore the response body.

## Write step outputs and annotations

```ts
import { fail, mask, setEnv, warn, writeOutputs } from "@r_masseater/github-workflow";

export const finish = writeOutputs({ changed: "true" });
export const hide = mask("a-token");
export const note = warn("The cache was empty.");
export const environment = setEnv({ TARGET: "main" });
export const stop = fail("The check failed.");
```

`writeOutputs` appends to the file named by `GITHUB_OUTPUT`, and `setEnv` appends to `GITHUB_ENV`. `fail` prints an error annotation and fails with `WorkflowFailed`.

## Run commands

`succeeds` returns whether a command exited with code 0. `mustSucceed` fails with `CommandFailed` otherwise. `outputOf` returns the trimmed standard output of a command that succeeded, and `finished` returns the output and the exit code without failing. A command that is interrupted gets `SIGTERM` and then `SIGKILL` after `forceKillAfter`, 10 seconds by default, so that an interrupted step such as a timeout never waits for a process that ignores `SIGTERM`.

```ts
import { outputOf } from "@r_masseater/github-workflow";

export const head = outputOf({ command: "git", args: ["rev-parse", "HEAD"] });
```

`sha256Of` hashes byte arrays and returns the hex digest.

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/github-workflow": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.

## License

[MIT](LICENSE)
