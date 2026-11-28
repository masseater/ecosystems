import { expect, test } from "vite-plus/test";

import { isRecord, parseJson } from "./record.ts";

test("a plain object is a record", () => {
  expect(isRecord({ a: 1 })).toBe(true);
  expect(isRecord({})).toBe(true);
});

test("null, arrays and primitives are not records", () => {
  expect(isRecord(null)).toBe(false);
  expect(isRecord([])).toBe(false);
  expect(isRecord("text")).toBe(false);
  expect(isRecord(1)).toBe(false);
  expect(isRecord(undefined)).toBe(false);
});

test("valid JSON text is parsed", () => {
  expect(parseJson('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  expect(parseJson("null")).toBeNull();
});

test("invalid JSON text gives undefined instead of throwing", () => {
  expect(parseJson("{")).toBeUndefined();
  expect(parseJson("")).toBeUndefined();
});
