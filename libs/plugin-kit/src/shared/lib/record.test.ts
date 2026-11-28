import { isNone, some } from "effect/Option";
import { expect, test } from "vite-plus/test";

import { isRecord, parseJson } from "./record.ts";

test("a plain object is a record", () => {
  expect(isRecord({ key: "value" })).toBe(true);
  expect(isRecord({})).toBe(true);
});

test("an array is not a record", () => {
  expect(isRecord([])).toBe(false);
  expect(isRecord(["value"])).toBe(false);
});

test("a string, a number and a missing value are not records", () => {
  expect(isRecord("text")).toBe(false);
  expect(isRecord(Number.NaN)).toBe(false);
  expect(isRecord(Symbol.for("none"))).toBe(false);
});

test("valid JSON text is parsed into a value", () => {
  expect(parseJson('{"key":["value"]}')).toStrictEqual(some({ key: ["value"] }));
});

test("text that is not JSON gives none instead of throwing", () => {
  expect(isNone(parseJson("{"))).toBe(true);
  expect(isNone(parseJson(""))).toBe(true);
});
