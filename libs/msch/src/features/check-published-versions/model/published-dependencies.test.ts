import { layer } from "@effect/vitest";
import { Array as Arr, ConfigProvider, Effect, Option, Record as Rec, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { expect } from "vite-plus/test";

import { changedRepositoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { missingVersions } from "./published-dependencies.ts";

const manifest = (name: string, version: string, dependencies: Record<string, string>): string =>
  `${JSON.stringify({ name, version, dependencies }, null, 2)}\n`;

const withBase = ConfigProvider.fromUnknown({ VPA_BASE: "HEAD" });

const routes: Readonly<Record<string, readonly string[]>> = {
  "registry.npmjs.org/@r_masseater%2fok": ["1.0.0", "1.2.0"],
  "registry.npmjs.org/@r_masseater%2fzed": ["1.0.0"],
  "registry.npmjs.org/@r_masseater%2fmerged": ["0.1.0"],
};

const respond = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<HttpClientResponse.HttpClientResponse> => {
  const { hostname, pathname } = new URL(request.url);
  const versions = Rec.get(routes, `${hostname}${pathname}`);
  return Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      Option.match(versions, {
        onNone: () => new Response("", { status: 404 }),
        onSome: (found) =>
          Response.json({ versions: Rec.fromEntries(Arr.map(found, (v) => [v, {}] as const)) }),
      }),
    ),
  );
};

const findsMissingVersions = Effect.gen(function* findsMissing() {
  const root = yield* changedRepositoryWith(
    {
      "pnpm-workspace.yaml": 'packages:\n  - "libs/*"\ncatalog:\n  "@r_masseater/zed": 9.0.0\n',
      "libs/merged/package.json": manifest("@r_masseater/merged", "0.2.0", {}),
      "libs/bumped/package.json": manifest("@r_masseater/bumped", "1.0.0", {}),
      "libs/user/package.json": manifest("@r_masseater/user", "1.0.0", {
        "@r_masseater/merged": "workspace:*",
        "@r_masseater/bumped": "workspace:*",
        "@r_masseater/zed": "catalog:",
        "@r_masseater/ok": "^1.0.0",
        effect: "^4.0.0",
      }),
    },
    { "libs/bumped/package.json": manifest("@r_masseater/bumped", "1.1.0", {}) },
  );
  const found = yield* missingVersions(root).pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, withBase),
    Effect.provideService(HttpClient.HttpClient, HttpClient.make(respond)),
  );
  expect(
    pipe(
      found,
      Arr.map(({ file, dependency }) => `${file} ${dependency}`),
    ),
  ).toStrictEqual([
    "libs/user/package.json @r_masseater/merged@0.2.0",
    "libs/user/package.json @r_masseater/zed@9.0.0",
  ]);
});

layer(fixtureLayer)("published dependencies", (it) => {
  it.effect(
    "finds a dependency range that no published version satisfies",
    () => findsMissingVersions,
  );
});
