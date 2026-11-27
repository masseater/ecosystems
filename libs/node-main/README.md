# @r_masseater/node-main

Runs an Effect program as a Node.js entry point with the Node services, an HTTP client and OTLP tracing already provided.

It requires Node.js 26 or later. `effect` is a peer dependency, so your program and this package share one copy of Effect.

```sh
vp add @r_masseater/node-main effect
```

## Run a program

`runMain` takes the service name that tracing reports and returns a function that runs a program.

```ts
import { runMain } from "@r_masseater/node-main";
import { Console, Effect } from "effect";

runMain("my-tool")(Console.log("hello").pipe(Effect.withSpan("greet")));
```

Traces go to the OTLP endpoint named by the `OTEL_EXPORTER_OTLP_*` variables. When none is set, nothing is sent.

## Provide your own services

`runMainWith` also takes a layer. The program can then use the services the layer provides.

```ts
import { runMainWith } from "@r_masseater/node-main";
import { Effect, Layer } from "effect";

runMainWith({ serviceName: "my-tool", services: Layer.empty })(Effect.void);
```

## Stop with the parent

`whileParentAlive` races a program against a parent process. Pass the parent's pid as an `Option`. When the pid is `none`, the program runs to its end. When the parent exits, the program is interrupted.

```ts
import { whileParentAlive } from "@r_masseater/node-main";
import { Effect, Option } from "effect";

const watched = Effect.never.pipe(whileParentAlive(Option.some("12345")));
```

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/node-main": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into `.claude/skills`.

## License

[MIT](LICENSE)
