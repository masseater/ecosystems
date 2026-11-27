import { expect, test } from "vite-plus/test";

import { text } from "#/entities/segment/index.ts";

import { mappedOutput } from "./output.ts";

const request = { fileName: "a.my", content: "hello\nworld", positionEncoding: "utf-16" } as const;

test("a successful result becomes mapped TypeScript code", () => {
  const output = mappedOutput({
    request,
    mapped: { status: "ok", segments: [text("export const a = 1;")] },
  });
  expect(output.extension).toBe(".ts");
  expect(output.text).toBe("export const a = 1;");
});

test("a failed result becomes the fallback with one diagnostic per issue", () => {
  const output = mappedOutput({
    request,
    mapped: {
      status: "error",
      fallback: "export {};",
      issues: [{ start: 6, end: 11, message: "bad word" }],
    },
  });
  expect(output.text).toBe("export {};");
  expect(output.diagnostics).toMatchObject([{ messageText: "bad word" }]);
});
