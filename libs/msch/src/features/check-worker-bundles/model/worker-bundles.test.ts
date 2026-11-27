import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkerBundles } from "./worker-bundles.ts";

const STACK = (main: string): string =>
  `import { Stack } from "alchemy";\n\nexport default Stack.make("worker", { main: "${main}" });\n`;

const SITE = `import { Website } from "@alchemy.run/cloudflare";\n\nexport const site = Website.Vite("site", { main: "./src/app/site.ts" });\n`;
const FRAMEWORK_ENTRY = `import { handler } from "#framework-entry";\n\nexport default { fetch: handler };\n`;

const GOOD = `import { answer } from "./answer.ts";\nimport { env } from "cloudflare:workers";\n\nexport default { fetch: () => new Response(String(answer) + String(env)) };\n`;
const BROKEN = `import { missing } from "#entry";\n\nexport default { fetch: () => new Response(String(missing)) };\n`;

const reportsOnlyWorkersThatFailToBundle = Effect.gen(
  function* reportsOnlyWorkersThatFailToBundle() {
    const root = yield* gitRepositoryWith({
      "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      "package.json": '{ "name": "root", "private": true }\n',
      "apps/good/package.json": '{ "name": "good", "private": true }\n',
      "apps/good/alchemy.run.ts": STACK("./src/app/good.ts"),
      "apps/good/src/app/good.ts": GOOD,
      "apps/good/src/app/answer.ts": "export const answer = 42;\n",
      "apps/broken/package.json":
        '{ "name": "broken", "private": true, "imports": { "#entry": { "node": "./src/app/node.ts" } } }\n',
      "apps/broken/src/app/node.ts": "export const missing = 1;\n",
      "apps/broken/alchemy.run.ts": STACK("./src/app/broken.ts"),
      "apps/broken/src/app/broken.ts": BROKEN,
    });
    const files = yield* RepositoryFiles;
    const problems = yield* checkWorkerBundles(root);
    expect(
      pipe(
        problems,
        Arr.map(({ file, rule }) => `${files.relative(root, file)} ${rule}`),
      ),
    ).toStrictEqual(["apps/broken/src/app/broken.ts worker-bundle"]);
    expect(
      pipe(
        problems,
        Arr.map(({ message }) => message),
      ),
    ).toStrictEqual([expect.stringContaining("#entry")]);
  },
);

const leavesFrameworkSitesToTheirBuild = Effect.gen(function* leavesFrameworkSitesToTheirBuild() {
  const root = yield* gitRepositoryWith({
    "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
    "package.json": '{ "name": "root", "private": true }\n',
    "apps/site/package.json": '{ "name": "site", "private": true }\n',
    "apps/site/alchemy.run.ts": SITE,
    "apps/site/src/app/site.ts": FRAMEWORK_ENTRY,
  });
  const problems = yield* checkWorkerBundles(root);
  expect(problems).toStrictEqual([]);
});

layer(fixtureLayer)("worker bundles", (it) => {
  it.effect(
    "reports a Worker entry that does not bundle and passes one that does",
    () => reportsOnlyWorkersThatFailToBundle,
  );
  it.effect(
    "does not bundle the entry of a site that its framework builds with its own plugins",
    () => leavesFrameworkSitesToTheirBuild,
  );
});
