import { fileURLToPath } from "node:url";

import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Schema, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { cloudflareResourceSyntax } from "./lint-overrides.config.ts";

const OXLINT = fileURLToPath(new URL("./bin/oxlint", import.meta.resolve("oxlint/package.json")));

const ESLINT_PLUGIN = fileURLToPath(import.meta.resolve("oxlint-plugin-eslint"));

const Config = Schema.fromJsonString(Schema.Unknown);

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(source: string) {
  const config = yield* Schema.encodeEffect(Config)({
    jsPlugins: [{ name: "eslint-js", specifier: ESLINT_PLUGIN }],
    rules: { "eslint-js/no-restricted-syntax": ["error", ...cloudflareResourceSyntax] },
  });
  const root = yield* directoryWith({ ".oxlintrc.json": config, "subject.ts": source });
  const handle = yield* ChildProcess.make(
    process.execPath,
    [OXLINT, "--format", "unix", "subject.ts"],
    {
      cwd: root,
      extendEnv: false,
      env: { LANG: "C" },
      stdin: "ignore",
    },
  );
  const [output] = yield* Effect.all(
    [handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return pipe(Str.split(output, "\n"), Arr.filter(Str.includes("no-restricted-syntax")));
}, Effect.scoped);

const flagged = Effect.fn("flagged")(function* flagged(source: string) {
  const findings = yield* findingsIn(source);
  expect({ source, findings: findings.length }).toStrictEqual({ source, findings: 1 });
});

const allowed = Effect.fn("allowed")(function* allowed(source: string) {
  const findings = yield* findingsIn(source);
  expect({ source, findings }).toStrictEqual({ source, findings: [] });
});

const BYPASSING_MODEL_CALLS = [
  "env.AI.run(MODEL, input);\n",
  "AI.run(MODEL, input);\n",
  "env.AI.run(MODEL, input, {});\n",
  "AI.run(MODEL, input, { gateway: { id: GATEWAY, metadata: {} } });\n",
  "env.AI.run(MODEL, input, { ...options });\n",
  'fetch(`BASE/accounts/account/ai/run/MODEL`, { headers: { authorization: "Bearer x" } });\n',
  'client.post("/ai/run/@cf/baai/bge-m3", { headers: { "cf-aig-metadata": "{}" } });\n',
  "client.post(`/accounts/account/ai/run/MODEL`, { body });\n",
];

const GATEWAYED_MODEL_CALLS = [
  "runWorkersAi({ call: (options) => env.AI.run(MODEL, input, options) });\n",
  "runWorkersAi({ call: (options) => AI.run(MODEL, input, options) });\n",
  'fetch(`BASE/accounts/account/ai/run/MODEL`, { headers: { "cf-aig-gateway-id": gateway, "cf-aig-metadata": metadata } });\n',
  "client.post(`/accounts/account/ai/run/MODEL`, { body, headers });\n",
  'HttpRouter.add("POST", "/client/v4/accounts/:account/ai/run/*", handler);\n',
  "const total = items.run(MODEL, input);\n",
];

const flagsEveryBypass = Effect.forEach(BYPASSING_MODEL_CALLS, flagged, {
  concurrency: 1,
  discard: true,
});

const allowsGatewayedCalls = Effect.forEach(GATEWAYED_MODEL_CALLS, allowed, {
  concurrency: 1,
  discard: true,
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("model call lint rules", (it) => {
  it.effect("report every model call that skips the gateway options", () => flagsEveryBypass);
  it.effect("leave calls that pass the gateway options alone", () => allowsGatewayedCalls);
});
