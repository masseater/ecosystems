import {
  Array as Arr,
  Config,
  ConfigProvider,
  Effect,
  Option,
  Predicate,
  Record,
  pipe,
} from "effect";

import type { ReceiverAddress } from "#/entities/telemetry/index.ts";

export type Environment = Readonly<Record<string, string | undefined>>;

const UNSET = "";

const POINTED = {
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: UNSET,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: UNSET,
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: UNSET,
  OTEL_TRACES_EXPORTER: "otlp",
  OTEL_METRICS_EXPORTER: "otlp",
  OTEL_LOGS_EXPORTER: "otlp",
} as const;

const QUICK_EXPORT = {
  OTEL_BSP_SCHEDULE_DELAY: "50",
  OTEL_BLRP_SCHEDULE_DELAY: "50",
  OTEL_METRIC_EXPORT_INTERVAL: "100",
  OTEL_METRIC_EXPORT_TIMEOUT: "100",
} as const;

const PROTOCOL = "OTEL_EXPORTER_OTLP_PROTOCOL";

const readVariable = (name: string): Effect.Effect<Option.Option<readonly [string, string]>> =>
  Config.option(Config.String(name)).pipe(
    Effect.map(Option.map((value): readonly [string, string] => [name, value])),
    Effect.orDie,
  );

const freshProvider = ConfigProvider.fromEnv();

const readAll = Effect.all(Arr.map([PROTOCOL, ...Record.keys(QUICK_EXPORT)], readVariable), {
  concurrency: 1,
});

const currentEnvironment: Effect.Effect<Environment> = pipe(
  readAll,
  Effect.map((found) => Record.fromEntries(Arr.getSomes(found))),
  Effect.provideService(ConfigProvider.ConfigProvider, freshProvider),
);

const endpointFor =
  (address: ReceiverAddress) =>
  (env: Environment): string =>
    Option.match(
      Option.liftPredicate(env[PROTOCOL], (protocol) => protocol === "grpc"),
      { onNone: () => address.httpEndpoint, onSome: () => address.grpcEndpoint },
    );

export const receiverEnvironment =
  (address: ReceiverAddress) =>
  (env: Environment): Readonly<Record<string, string>> => ({
    ...pipe(
      QUICK_EXPORT,
      Record.filter((_value, name) => Predicate.isUndefined(env[name])),
    ),
    ...POINTED,
    OTEL_EXPORTER_OTLP_ENDPOINT: endpointFor(address)(env),
  });

export const receiverEnvironmentNow = (
  address: ReceiverAddress,
): Effect.Effect<Readonly<Record<string, string>>> =>
  currentEnvironment.pipe(Effect.map(receiverEnvironment(address)));
