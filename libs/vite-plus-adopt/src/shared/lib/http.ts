import { Effect, Schedule } from "effect";
import { HttpClient } from "effect/http";
import type { HttpClientError, HttpClientRequest } from "effect/http";

const RETRY_DELAY = "1 second";
const RETRIES = 4;

/** @internal */
export const fetchBytes = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<Uint8Array, HttpClientError.HttpClientError, HttpClient.HttpClient> =>
  Effect.gen(function* fetchArchive() {
    const httpClient = yield* HttpClient.HttpClient;
    const response = yield* httpClient
      .pipe(
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({ schedule: Schedule.exponential(RETRY_DELAY), times: RETRIES }),
      )
      .execute(request);
    const body = yield* response.arrayBuffer;
    return new Uint8Array(body);
  });
