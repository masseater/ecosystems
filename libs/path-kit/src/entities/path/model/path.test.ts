import { Option } from "effect";
import { describe, expect, test } from "vite-plus/test";

import {
  afterPrefix,
  ancestors,
  baseName,
  below,
  isInside,
  isWithin,
  join,
  parent,
  relativeTo,
  stem,
} from "./path.ts";

describe("baseName", () => {
  test("returns the last non-empty segment", () => {
    expect(baseName("libs/msch/package.json")).toBe("package.json");
    expect(baseName("libs/msch/")).toBe("msch");
    expect(baseName("")).toBe("");
  });
});

describe("parent and ancestors", () => {
  test("drop the last segment", () => {
    expect(parent("a/b/c")).toBe("a/b");
    expect(ancestors("a/b/c")).toStrictEqual(["a/b", "a", ""]);
  });
});

describe("join", () => {
  test("skips an empty directory", () => {
    expect(join("a")("b")).toBe("a/b");
    expect(join("")("b")).toBe("b");
  });
});

describe("stem", () => {
  test("keeps the part before the first dot", () => {
    expect(stem("index.test.ts")).toBe("index");
  });
});

describe("afterPrefix", () => {
  test("returns the rest only when the prefix matches", () => {
    expect(afterPrefix("./")("./a")).toStrictEqual(Option.some("a"));
    expect(afterPrefix("./")("a")).toStrictEqual(Option.none());
  });
});

describe("isWithin and isInside", () => {
  test("isWithin includes the directory itself and an empty directory", () => {
    expect(isWithin("libs")("libs")).toBe(true);
    expect(isWithin("libs")("libs/msch")).toBe(true);
    expect(isWithin("libs")("libsx")).toBe(false);
    expect(isWithin("")("anything")).toBe(true);
  });

  test("isInside excludes the directory itself and treats . as the root", () => {
    expect(isInside("libs")("libs")).toBe(false);
    expect(isInside("libs")("libs/msch")).toBe(true);
    expect(isInside(".")("libs")).toBe(true);
  });
});

describe("below", () => {
  test("returns the path under the directory", () => {
    expect(below("libs")("libs/msch/a.ts")).toStrictEqual(Option.some("msch/a.ts"));
    expect(below("libs")("other/a.ts")).toStrictEqual(Option.none());
    expect(below("")("a.ts")).toStrictEqual(Option.some("a.ts"));
  });
});

describe("relativeTo", () => {
  test("accepts backslash separators", () => {
    expect(relativeTo(String.raw`C:\repo`)(String.raw`C:\repo\libs\a.ts`)).toStrictEqual(
      Option.some("libs/a.ts"),
    );
  });
});
