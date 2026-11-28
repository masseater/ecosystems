import { it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Record as Rec } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { expect } from "vite-plus/test";

import { referenceOf } from "./reference-links.ts";
import { resolveReference } from "./resolve-reference.ts";
import type { Outcome } from "./resolve-reference.ts";

const FOUND = "found";

const lines = (parts: readonly string[]): string => Arr.join(parts, "\n");

const SOURCE = lines([
  "export interface Config {",
  "  readonly name: string;",
  "}",
  "export const runCli = () => 1;",
  "",
]);
const RUST = lines([
  "pub struct Config;",
  "impl Config {",
  "    pub fn validate(&self) {}",
  "}",
  "",
]);

const json = (body: unknown): Response => Response.json(body);
const repository = (fullName: string, archived = false): Response =>
  json({ full_name: fullName, archived, default_branch: "main" });

const routes: Readonly<Record<string, () => Response>> = {
  "api.github.com/repos/o/r": () => repository("o/r"),
  "api.github.com/repos/o/renamed": () => repository("o/new-name"),
  "api.github.com/repos/o/old": () => repository("o/old", true),
  "api.github.com/repos/o/down": () => new Response("", { status: 503 }),
  "api.github.com/repos/o/r/contents/libs/msch": () => json([]),
  "api.github.com/repos/o/r/contents/src/a.ts": () => new Response(SOURCE),
  "api.github.com/repos/o/r/contents/src/a.rs": () => new Response(RUST),
  "api.github.com/repos/o/r/contents/src/b.ts?ref=dev": () => new Response(SOURCE),
  "api.github.com/repos/o/r/contents/data.json": () => new Response("{}"),
  "registry.npmjs.org/effect": () =>
    json({ "dist-tags": { latest: "1.0.0" }, versions: { "1.0.0": {} } }),
  "registry.npmjs.org/old-package": () =>
    json({
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": { deprecated: "use new-package" } },
    }),
};

const respond = (
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<HttpClientResponse.HttpClientResponse> => {
  const { hostname, pathname, search } = new URL(request.url);
  const route = Rec.get(routes, `${hostname}${pathname}`).pipe(
    Option.orElse(() => Rec.get(routes, `${hostname}${pathname}${search}`)),
  );
  return Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      Option.match(route, {
        onNone: () => new Response("", { status: 404 }),
        onSome: (answer) => answer(),
      }),
    ),
  );
};

const describe = (outcome: Outcome): string => {
  if (outcome.kind === "found") {
    return FOUND;
  }
  return `${outcome.kind}: ${outcome.reason}`;
};

const outcomeOf = (destination: string): Effect.Effect<string> =>
  Option.match(referenceOf(destination), {
    onNone: () => Effect.succeed("not a reference"),
    onSome: (reference) =>
      resolveReference(reference).pipe(
        Effect.map(describe),
        Effect.provideService(HttpClient.HttpClient, HttpClient.make(respond)),
      ),
  });

const resolved = (destinations: readonly string[]): Effect.Effect<readonly string[]> =>
  Effect.forEach(destinations, (destination) => outcomeOf(destination), { concurrency: 1 });

it.effect("finds a repository, a directory and a file", () =>
  Effect.gen(function* findsPresent() {
    const outcomes = yield* resolved(["github:o/r", "github:o/r/libs/msch", "github:o/r/src/a.ts"]);
    expect(outcomes).toStrictEqual([FOUND, FOUND, FOUND]);
  }),
);

it.effect("reports a missing repository, path, rename and archive", () =>
  Effect.gen(function* reportsStale() {
    const outcomes = yield* resolved([
      "github:o/missing",
      "github:o/r/libs/gone",
      "github:o/renamed",
      "github:o/old",
    ]);
    expect(outcomes).toStrictEqual([
      expect.stringContaining("broken: o/missing does not exist"),
      expect.stringContaining("broken: libs/gone does not exist on main of o/r"),
      expect.stringContaining("has moved to o/new-name"),
      expect.stringContaining("is archived"),
    ]);
  }),
);

it.effect("reads declared symbols from the file", () =>
  Effect.gen(function* readsSymbols() {
    const outcomes = yield* resolved([
      "github:o/r/src/a.ts#Config",
      "github:o/r/src/a.ts#runCli",
      "github:o/r/src/a.ts#Config.name",
      "github:o/r/src/a.ts#Missing",
      "github:o/r/src/a.rs#Config.validate",
      "github:o/r/data.json#key",
    ]);
    expect(outcomes).toStrictEqual([
      FOUND,
      FOUND,
      FOUND,
      expect.stringContaining("declares no Missing"),
      FOUND,
      expect.stringContaining("not a file msch can read"),
    ]);
  }),
);

it.effect("checks npm packages", () =>
  Effect.gen(function* checksNpm() {
    const outcomes = yield* resolved(["npm:effect", "npm:old-package", "npm:nothing"]);
    expect(outcomes).toStrictEqual([
      FOUND,
      expect.stringContaining("deprecated: use new-package"),
      expect.stringContaining("is not published on npm"),
    ]);
  }),
);

it.effect("leaves a failed lookup unchecked", () =>
  Effect.gen(function* leavesUnchecked() {
    const outcomes = yield* resolved(["github:o/down"]);
    expect(outcomes).toStrictEqual([
      expect.stringContaining("unchecked: the lookup answered HTTP 503"),
    ]);
  }),
);

it.effect("checks a link that names a branch on that branch", () =>
  Effect.gen(function* checksBranchLink() {
    const outcomes = yield* resolved([
      "https://github.com/o/r/blob/dev/src/b.ts",
      "https://github.com/o/r/blob/main/src/b.ts",
      "https://github.com/o/r/tree/main",
    ]);
    expect(outcomes).toStrictEqual([
      FOUND,
      expect.stringContaining("src/b.ts does not exist on main of o/r"),
      FOUND,
    ]);
  }),
);
