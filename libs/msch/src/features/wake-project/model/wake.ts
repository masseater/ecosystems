import { Boolean as Bool, Console, Effect, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { BROKER, actionsOidcToken } from "#/shared/lib/credential-broker.ts";

const Woken = Schema.Struct({ woken: Schema.Boolean });

/** @internal */
export const wakeOnRedMain = Effect.fn("wake.redMain")(function* wakeOnRedMain() {
  const oidc = yield* actionsOidcToken;
  if (Option.isNone(oidc)) {
    return yield* Console.log("Not running in GitHub Actions: nothing to tell the broker");
  }
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(`${BROKER}wake/main-red`).pipe(
    HttpClientRequest.bearerToken(oidc.value),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const { woken } = yield* HttpClientResponse.schemaBodyJson(Woken)(response);
  return yield* Console.log(
    Bool.match(woken, {
      onTrue: () => "Asked the project to fix main",
      onFalse: () => "Asked recently: skipped",
    }),
  );
});
