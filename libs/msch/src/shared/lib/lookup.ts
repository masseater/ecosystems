import { Config, Effect, Option } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

const USER_AGENT = "msch (https://github.com/masseater/ecosystems/tree/main/libs/msch)";

/** @internal */
export const JSON_ACCEPT = "application/json";

/** @internal */
export interface Lookup {
  readonly url: string;
  readonly token: Option.Option<string>;
  readonly accept: string;
}

const requestOf = ({ url, token, accept }: Lookup): HttpClientRequest.HttpClientRequest => {
  const request = HttpClientRequest.get(url).pipe(
    HttpClientRequest.setHeader("user-agent", USER_AGENT),
    HttpClientRequest.setHeader("accept", accept),
  );
  return Option.match(token, {
    onNone: () => request,
    onSome: (value) => HttpClientRequest.bearerToken(value)(request),
  });
};

/** @internal */
export const sent = (
  lookup: Lookup,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError,
  HttpClient.HttpClient
> => HttpClient.HttpClient.pipe(Effect.flatMap((client) => client.execute(requestOf(lookup))));

/** @internal */
export const fetched = (
  lookup: Lookup,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError,
  HttpClient.HttpClient
> => sent(lookup).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));

/** @internal */
export const jsonLookup = ({
  url,
  token,
}: {
  readonly url: string;
  readonly token: Option.Option<string>;
}): Lookup => ({
  url,
  token,
  accept: JSON_ACCEPT,
});

/** @internal */
export const publicLookup = (url: string): Lookup => jsonLookup({ url, token: Option.none() });

/** @internal */
export const githubToken: Effect.Effect<Option.Option<string>> = Config.option(
  Config.String("GH_TOKEN").pipe(Config.orElse(() => Config.String("GITHUB_TOKEN"))),
).pipe(Effect.orElseSucceed(() => Option.none<string>()));
