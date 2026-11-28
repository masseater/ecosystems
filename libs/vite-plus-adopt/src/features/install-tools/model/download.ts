import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClient } from "effect/http";

import { attempt } from "#/shared/lib/attempt.ts";
import { checksFailed, toolFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import { fetchBytes } from "#/shared/lib/http.ts";

import type { Planned } from "./plan.ts";

const HEX = 16;
const BYTE_DIGITS = 2;

const hexOf = (digest: ArrayBuffer): string =>
  pipe(
    [...new Uint8Array(digest)],
    Arr.map((byte) => Str.padStart(BYTE_DIGITS, "0")(byte.toString(HEX))),
    Arr.join(""),
  );

const sha256Of = (bytes: Uint8Array): Effect.Effect<string, VpToolsError> =>
  attempt("sha256")(() => crypto.subtle.digest("SHA-256", new Uint8Array(bytes))).pipe(
    Effect.map(hexOf),
  );

/** @internal */
export interface Downloaded {
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

const verified =
  (url: string, expected: Option.Option<string>) =>
  (downloaded: Downloaded): Effect.Effect<Downloaded, VpToolsError> =>
    Option.match(expected, {
      onNone: () => Effect.succeed(downloaded),
      onSome: (pinned) =>
        Effect.filterOrFail(
          Effect.succeed(downloaded),
          ({ sha256 }) => sha256 === pinned,
          ({ sha256 }) =>
            checksFailed(`${url} has sha256 ${sha256}, but vpa-lock.json pins ${pinned}`),
        ),
    });

/** @internal */
export const downloadAsset =
  (expected: Option.Option<string>) =>
  ({
    name,
    version,
    url,
  }: Planned): Effect.Effect<Downloaded, VpToolsError, HttpClient.HttpClient> =>
    fetchBytes(HttpClientRequest.get(url)).pipe(
      Effect.mapError(toolFailed(`downloading ${name}@${version}`)),
      Effect.flatMap((bytes) =>
        sha256Of(bytes).pipe(Effect.map((sha256): Downloaded => ({ bytes, sha256 }))),
      ),
      Effect.flatMap(verified(url, expected)),
    );
