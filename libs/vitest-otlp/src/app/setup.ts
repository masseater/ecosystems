import { Effect, Exit, Option, Record as Rec, Scope } from "effect";
import { afterAll, inject, vi } from "vite-plus/test";

import { FORWARD_KEY } from "#/entities/semconv/index.ts";
import { receiverEnvironmentNow, startReceiver } from "#/features/receive-otlp/index.ts";

import { setReceiver } from "./current-receiver.ts";

const scope = Scope.makeUnsafe();
const forwardOrigins = Option.getOrElse(Option.fromNullishOr(inject(FORWARD_KEY)), () => []);

const receiver = await Effect.runPromise(Scope.provide(startReceiver(forwardOrigins), scope));
setReceiver(Option.some(receiver));
const environment = await Effect.runPromise(receiverEnvironmentNow(receiver.address));
for (const [name, value] of Rec.toEntries(environment)) {
  vi.stubEnv(name, value);
}

const stop = Effect.sync(() => {
  setReceiver(Option.none());
}).pipe(Effect.andThen(Scope.close(scope, Exit.void)));

afterAll(() => Effect.runPromise(stop));
