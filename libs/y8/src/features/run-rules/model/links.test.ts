import { Effect } from "effect";
import { expect, it } from "vite-plus/test";

import { linksIn } from "./links.ts";

it("linksIn lists the destination and the line of every link", () =>
  Effect.gen(function* listed() {
    const found = yield* linksIn([
      {
        path: "a.md",
        text: "# a\n\nSee [msch](github:o/r/libs/msch) and <npm:effect@4.0.0>.\n\n- [site](https://example.com)\n\n```md\n[no](github:o/r)\n```\n",
      },
    ]);
    expect(found).toStrictEqual([
      { path: "a.md", line: 3, destination: "github:o/r/libs/msch" },
      { path: "a.md", line: 3, destination: "npm:effect@4.0.0" },
      { path: "a.md", line: 5, destination: "https://example.com" },
    ]);
  }).pipe(Effect.runPromise));
