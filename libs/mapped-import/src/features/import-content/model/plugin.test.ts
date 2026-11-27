import { expect, test } from "vite-plus/test";

import { declarationPathOf } from "./plugin.ts";

test("the declaration file sits next to the source with the extension kept", () => {
  expect(declarationPathOf(".my")("/a/b/song.my")).toBe("/a/b/song.d.my.ts");
});

test("the extension is matched literally and case-insensitively at the end", () => {
  expect(declarationPathOf(".a+b")("x.a+b")).toBe("x.d.a+b.ts");
  expect(declarationPathOf(".my")("x.MY")).toBe("x.d.my.ts");
});

test("an id that does not end with the extension is left alone", () => {
  expect(declarationPathOf(".my")("x.my.map")).toBe("x.my.map");
});
