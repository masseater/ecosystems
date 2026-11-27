---
name: write-actions-steps
description: >
  Use when a GitHub Actions step is written in TypeScript with Effect and must call the GitHub API
  of its own repository, write GITHUB_OUTPUT or GITHUB_ENV, mask a value, emit annotations, or run
  a command: getJson, postJson, post, patch, remove, writeOutputs, setEnv, mask, warn, fail,
  succeeds, mustSucceed, outputOf, finished and sha256Of.
metadata:
  type: core
  library: "@r_masseater/github-workflow"
  library_version: 0.1.0
sources:
  - src/app/**
  - src/shared/**
  - README.md
---

# write-actions-steps

A step written with this library reads everything it needs from the environment GitHub Actions sets, so the step takes no repository or token argument.

## Setup

```sh
vp add @r_masseater/github-workflow effect
```

Give the step `GITHUB_REPOSITORY` and one of `GH_TOKEN` or `GITHUB_TOKEN`. The API functions fail with a `ConfigError` when they are missing.

## Call the API

```ts
import { getJson, patch } from "@r_masseater/github-workflow";
import { Schema } from "effect";

const Issue = Schema.Struct({ state: Schema.String });

export const read = getJson(Issue)("issues/1");
export const close = patch({ path: "issues/1", body: { state: "closed" } });
```

Run the effect with an HTTP client, for example the one `@r_masseater/node-main` provides.

## Report results

```ts
import { fail, writeOutputs } from "@r_masseater/github-workflow";

export const ok = writeOutputs({ changed: "true" });
export const ng = fail("The check failed.");
```

Call `mask` before a secret reaches any output. `fail` both prints the annotation and fails the effect.

## Run commands

```ts
import { mustSucceed, outputOf } from "@r_masseater/github-workflow";

export const build = mustSucceed({ command: "vp", args: ["run", "build"] });
export const head = outputOf({ command: "git", args: ["rev-parse", "HEAD"] });
```

## Common mistakes

### Passing the token as an argument

Wrong:

```ts
getJson(Issue)("issues/1", { token });
```

Correct: set `GH_TOKEN` in the step's `env` and call `getJson(Issue)("issues/1")`.
