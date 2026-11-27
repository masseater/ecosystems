import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

import { sha256Of } from "./digest.ts";

const encoder = new TextEncoder();

test("hashing the empty input gives the well-known empty digest", () =>
  Effect.gen(function* empty() {
    const digest = yield* sha256Of([]);
    expect(digest).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  }).pipe(Effect.runPromise));

test("hashing several parts equals hashing their concatenation", () =>
  Effect.gen(function* parts() {
    const split = yield* sha256Of([encoder.encode("ab"), encoder.encode("c")]);
    const whole = yield* sha256Of([encoder.encode("abc")]);
    expect(split).toBe(whole);
    expect(whole).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  }).pipe(Effect.runPromise));
