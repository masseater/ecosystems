---
name: run-effect-main
description: >
  Use when an Effect program must run as a Node.js entry point with the Node services, an HTTP
  client and OTLP tracing provided: runMain, runMainWith, and whileParentAlive for a child
  process that must stop when its parent exits.
metadata:
  type: core
  library: "@r_masseater/node-main"
sources:
  - src/app/**
  - src/features/**
  - README.md
---

# run-effect-main

`runMain` is the one call that starts an Effect program in Node.js. It provides the Node services and a fetch based HTTP client, sends traces, logs and metrics over OTLP, and ends the process when the program ends.

## Setup

```sh
vp add @r_masseater/node-main effect
```

## Start a program

```ts
import { runMain } from "@r_masseater/node-main";
import { Console, Effect } from "effect";

runMain("my-tool")(Console.log("hello").pipe(Effect.withSpan("greet")));
```

The argument is the service name that tracing reports. Use the name of the tool, not the name of a file.

## Provide services of your own

```ts
import { runMainWith } from "@r_masseater/node-main";
import { Effect, Layer } from "effect";

runMainWith({ serviceName: "my-tool", services: Layer.empty })(Effect.void);
```

`services` is built once and merged with the Node services, so the program can use everything it provides.

Pass `onFailure` to `runMainWith` to write the failure report yourself. The runtime then stops reporting on its own, so `onFailure` must print everything the owner needs to see.

## Stop a child with its parent

```ts
import { whileParentAlive } from "@r_masseater/node-main";
import { Effect, Option } from "effect";

const watched = Effect.never.pipe(whileParentAlive(Option.some("12345")));
```

`whileParentAlive` checks the parent pid every two seconds. With `Option.none()` the program is never interrupted.

## Common mistakes

### Calling `NodeRuntime.runMain` directly

Wrong:

```ts
import { runMain } from "@effect/platform-node/NodeRuntime";

runMain(program);
```

Correct:

```ts
import { runMain } from "@r_masseater/node-main";

runMain("my-tool")(program);
```

The direct call has no tracing and none of the services the program expects.
