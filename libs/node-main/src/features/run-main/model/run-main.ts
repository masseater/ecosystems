import { runMain as nodeRuntimeRunMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import type { NodeServices } from "@effect/platform-node/NodeServices";
import { Effect, Layer, Option } from "effect";
import type { Cause } from "effect";
import { FetchHttpClient } from "effect/http";
import type { HttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";

/** @internal */
export type Platform = NodeServices | HttpClient.HttpClient;

/** @internal */
export type Run<Provided> = <Success, Failure>(
  program: Effect.Effect<Success, Failure, Platform | Provided>,
) => void;

/** @internal */
export type Report<Provided> = <Failure>(
  cause: Cause.Cause<Failure>,
) => Effect.Effect<void, never, Platform | Provided>;

const platform = Layer.mergeAll(nodeServices, FetchHttpClient.layer);

const runWithTracingAnd =
  <Provided, LayerFailure>({
    serviceName,
    services,
    onFailure,
  }: Readonly<{
    serviceName: string;
    services: Layer.Layer<Provided, LayerFailure, Platform>;
    onFailure?: Report<Provided>;
  }>): Run<Provided> =>
  (program) => {
    const tracing = Otlp.layerFromConfig({ resource: { serviceName } }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer),
    );
    const provided = Layer.provideMerge(services, platform);
    const report = Option.fromNullishOr(onFailure);
    const reported = Option.match(report, {
      onNone: () => program,
      onSome: (handler) => Effect.tapCause(program, handler),
    });
    nodeRuntimeRunMain(
      Layer.mergeAll(tracing, provided).pipe(
        Layer.build,
        Effect.flatMap((context) => Effect.provideContext(reported, context)),
        Effect.scoped,
      ),
      { disableErrorReporting: Option.isSome(report) },
    );
  };

const runWithTracing = (serviceName: string): Run<never> =>
  runWithTracingAnd({ serviceName, services: Layer.empty });

/** @internal */
export const runMainWith = runWithTracingAnd;

/** @internal */
export const runMain = runWithTracing;
