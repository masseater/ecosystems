import { mask } from "@r_masseater/github-workflow";
import { Config, Effect, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

/** @internal */
export const BROKER = "https://credentials.masseater.dev/";

const AUDIENCE = "masseater-dev-credential-broker";

const IdToken = Schema.Struct({ value: Schema.String });

/** @internal */
export const oidcToken = Effect.fn("broker.oidc")(function* oidcToken(
  requestUrl: string,
  requestToken: Redacted.Redacted,
) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.get(`${requestUrl}&audience=${AUDIENCE}`).pipe(
    HttpClientRequest.bearerToken(Redacted.value(requestToken)),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const { value } = yield* HttpClientResponse.schemaBodyJson(IdToken)(response);
  yield* mask(value);
  return value;
});

/** @internal */
export const actionsOidcToken = Effect.gen(function* actionsOidcToken() {
  const requestUrl = yield* Config.option(Config.String("ACTIONS_ID_TOKEN_REQUEST_URL"));
  const requestToken = yield* Config.option(Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN"));
  if (Option.isNone(requestUrl) || Option.isNone(requestToken)) {
    return Option.none<string>();
  }
  const token = yield* oidcToken(requestUrl.value, requestToken.value);
  return Option.some(token);
});
