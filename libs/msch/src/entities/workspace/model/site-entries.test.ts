import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { siteEntries } from "./site-entries.ts";

const SERVER_ENTRY = `import { layerHttp } from "@effect/ui/html/HtmlServerHttp";

export default layerHttp(App, { routes });
`;

const OTHER_IMPORT = `import { Html } from "@effect/ui/html";\n\nexport default Html;\n`;

const findsServerEntriesByTheirImport = Effect.gen(function* findsServerEntriesByTheirImport() {
  const root = yield* gitRepositoryWith({
    "apps/docs/src/app/entry.server.ts": SERVER_ENTRY,
    "apps/docs/src/app/app.ts": OTHER_IMPORT,
    "apps/blog/src/app/pages.ts": SERVER_ENTRY,
    "apps/blog/src/app/pages.test.ts": SERVER_ENTRY,
  });
  const found = yield* siteEntries(root);
  expect(Arr.sort(found, Str.Order)).toStrictEqual([
    "apps/blog/src/app/pages.ts",
    "apps/docs/src/app/entry.server.ts",
  ]);
});

layer(fixtureLayer)("siteEntries", (it) => {
  it.effect(
    "finds the files that import the Effect UI HTTP layer, wherever they live",
    () => findsServerEntriesByTheirImport,
  );
});
