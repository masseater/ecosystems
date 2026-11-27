import { describe, expect, test } from "vite-plus/test";

import { matcher, selects } from "./glob.ts";

describe("matcher", () => {
  test("matches dot files and any of the patterns", () => {
    const matches = matcher(["src/**/*.ts", "*.md"]);
    expect(matches("src/a/b.ts")).toBe(true);
    expect(matches(".hidden.md")).toBe(true);
    expect(matches("lib/a.ts")).toBe(false);
  });

  test("matches nothing when there are no patterns", () => {
    expect(matcher([])("a.ts")).toBe(false);
  });
});

describe("selects", () => {
  test("applies the negated patterns as exclusions", () => {
    const applies = selects(["src/**", "!src/gen/**"]);
    expect(applies("src/a.ts")).toBe(true);
    expect(applies("src/gen/a.ts")).toBe(false);
    expect(applies("other/a.ts")).toBe(false);
  });

  test("selects nothing without an included pattern", () => {
    expect(selects(["!src/gen/**"])("src/a.ts")).toBe(false);
  });
});
