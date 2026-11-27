import { mask } from "@r_masseater/github-workflow";
import { Console, Effect, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { BROKER, actionsOidcToken } from "#/shared/lib/credential-broker.ts";

const Issued = Schema.Record(Schema.String, Schema.Unknown);

/** @internal */
export interface Credential {
  readonly kind: string;
  readonly field: string;
}

const issued = Effect.fn("publish.issued")(function* issued(
  oidc: string,
  { kind, field }: Credential,
) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.post(`${BROKER}?only=${kind}`).pipe(
    HttpClientRequest.bearerToken(oidc),
  );
  const response = yield* HttpClient.filterStatusOk(client).execute(request);
  const body = yield* HttpClientResponse.schemaBodyJson(Issued)(response);
  const token = Option.filter(
    Option.fromNullishOr(body[field]),
    (value): value is string => typeof value === "string" && value !== "",
  );
  yield* Effect.forEach(Option.toArray(token), mask, { concurrency: 1, discard: true });
  return token;
});

/** @internal */
export const brokerCredential = Effect.fn("publish.brokerCredential")(function* brokerCredential(
  credential: Credential,
) {
  return yield* actionsOidcToken.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (oidc) => issued(oidc, credential),
      }),
    ),
    Effect.tapError(() => Console.log(`The credential broker gave no ${credential.field}`)),
    Effect.orElseSucceed(() => Option.none<string>()),
  );
});
