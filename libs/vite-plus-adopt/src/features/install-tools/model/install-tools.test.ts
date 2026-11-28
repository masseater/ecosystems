import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import {
  Array as Arr,
  ConfigProvider,
  Effect,
  Exit,
  FileSystem,
  Option,
  Path,
  Ref,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";

import type { FixtureServices } from "#/shared/lib/fixture.test.support.ts";
import { directoryWith, lines, tarGzArchive } from "#/shared/lib/fixture.test.support.ts";

import { installTools } from "./install-tools.ts";

type InstallExit = Effect.Success<ReturnType<typeof install>>;

const NONE = 0;
const ONE = 1;
const HEX = 16;
const BYTE_DIGITS = 2;
const PLATFORM = `${process.platform}-${process.arch}`;
const OTHER = pipe(
  ["linux-x64", "darwin-arm64"],
  Arr.findFirst((platform) => platform !== PLATFORM),
  Option.getOrElse(() => "linux-x64"),
);
const URL_OF_DEMO = "https://github.com/owner/demo/releases/download/v1.2.3/demo-1.2.3.tar.gz";

const ARCHIVE = { "demo-1.2.3/bin/demo": "#!/bin/sh\necho demo\n", "demo-1.2.3/README.md": "x\n" };

const config = lines(
  "export default {",
  "  tools: {",
  `    "owner/demo": { version: "1.2.3", assets: { "${PLATFORM}": "demo-{version}.tar.gz", "${OTHER}": "other.zip" } },`,
  "  },",
  "};",
);

const hexByte = (byte: number): string => Str.padStart(BYTE_DIGITS, "0")(byte.toString(HEX));

const hexOf = (digest: ArrayBuffer): string => {
  const bytes = [...new Uint8Array(digest)];
  return pipe(bytes, Arr.map(hexByte), Arr.join(""));
};

const sha256 = (bytes: Uint8Array): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new Uint8Array(bytes))).pipe(
    Effect.map(hexOf),
  );

interface Run {
  readonly root: string;
  readonly cache: string;
  readonly requests: Ref.Ref<readonly string[]>;
}

const prepare = (
  configText: string,
  files: Readonly<Record<string, string>> = {},
): Effect.Effect<Run, never, FixtureServices> =>
  Effect.gen(function* prepareRun() {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* directoryWith({ ...files, "vite.config.ts": configText });
    const cache = yield* fs
      .makeTempDirectoryScoped({ prefix: "vpa-tool-cache-" })
      .pipe(Effect.orDie);
    const requests = yield* Ref.make<readonly string[]>([]);
    return { root, cache, requests };
  });

const respondWith =
  (requests: Ref.Ref<readonly string[]>, archive: Uint8Array) =>
  (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.Effect<HttpClientResponse.HttpClientResponse> =>
    Ref.update(requests, (urls) => [...urls, request.url]).pipe(
      Effect.as(archive),
      Effect.map((bytes) => new Response(bytes)),
      Effect.map((body) => HttpClientResponse.fromWeb(request, body)),
    );

const install = (
  { root, cache, requests }: Run,
  archive: Uint8Array,
  environment: Readonly<Record<string, string>> = {},
): Effect.Effect<
  Exit.Exit<Option.Option<number>, Effect.Error<ReturnType<typeof installTools>>>,
  never,
  FixtureServices
> => {
  const client = HttpClient.make(respondWith(requests, archive));
  const variables = { XDG_CACHE_HOME: cache, LOCALAPPDATA: cache, ...environment };
  return installTools(root).pipe(
    Effect.provideService(HttpClient.HttpClient, client),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnvRecord(variables)),
    Effect.exit,
  );
};

const lockOf = (
  root: string,
): Effect.Effect<string, PlatformError.PlatformError, FixtureServices> =>
  Effect.gen(function* readLock() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fs.readFileString(path.join(root, "vpa-lock.json"));
  });

const messageOf = (exit: InstallExit): Option.Option<string> =>
  pipe(
    Exit.findErrorOption(exit),
    Option.map(({ message }) => message),
  );

const linksTheBinary = Effect.gen(function* linksTheBinary() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(config);
  const exit = yield* install(run, archive);
  deepStrictEqual(exit, Exit.succeed(Option.some(ONE)));
  if (process.platform !== "win32") {
    const target = yield* fs.readLink(path.join(run.root, "node_modules", ".bin", "demo"));
    assertTrue(Str.startsWith(run.cache)(target));
    assertTrue(Str.endsWith(path.join("bin", "demo"))(target));
  }
});

const recordsTheChecksum = Effect.gen(function* recordsTheChecksum() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(config);
  yield* install(run, archive);
  const expected = yield* sha256(archive);
  const lock = yield* lockOf(run.root);
  assertTrue(Str.includes(`"${URL_OF_DEMO}": "${expected}"`)(lock));
  const requested = yield* Ref.get(run.requests);
  deepStrictEqual(requested, [URL_OF_DEMO]);
});

const reusesTheCacheOnceLocked = Effect.gen(function* reusesTheCacheOnceLocked() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(config);
  yield* install(run, archive);
  yield* install(run, archive);
  const requested = yield* Ref.get(run.requests);
  strictEqual(requested.length, ONE);
});

const failsWhenTheAssetChanged = Effect.gen(function* failsWhenTheAssetChanged() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const replaced = yield* tarGzArchive({ "demo-1.2.3/bin/demo": "tampered\n" });
  const first = yield* prepare(config);
  yield* install(first, archive);
  const lock = yield* lockOf(first.root);
  const second = yield* prepare(config, { "vpa-lock.json": lock });
  const exit = yield* install(second, replaced);
  const mentionsPin = messageOf(exit).pipe(Option.exists(Str.includes("vpa-lock.json pins")));
  assertTrue(mentionsPin);
});

const skipsWhenDisabled = Effect.gen(function* skipsWhenDisabled() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(config);
  const exit = yield* install(run, archive, { VPA_TOOLS: "false" });
  deepStrictEqual(exit, Exit.succeed(Option.none()));
  const requested = yield* Ref.get(run.requests);
  deepStrictEqual(requested, []);
});

const skipsAToolWithoutThisPlatform = Effect.gen(function* skipsAToolWithoutThisPlatform() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(
    lines(
      "export default {",
      `  tools: { "owner/demo": { version: "1.2.3", assets: { "${OTHER}": "demo.zip" } } },`,
      "};",
    ),
  );
  const exit = yield* install(run, archive);
  deepStrictEqual(exit, Exit.succeed(Option.some(NONE)));
  const requested = yield* Ref.get(run.requests);
  deepStrictEqual(requested, []);
});

const needsABaseWithoutAnOwner = Effect.gen(function* needsABaseWithoutAnOwner() {
  const archive = yield* tarGzArchive(ARCHIVE);
  const run = yield* prepare(
    lines(
      "export default {",
      `  tools: { dotnet: { version: "1.0.0", assets: { "${PLATFORM}": "dotnet.tar.gz" } } },`,
      "};",
    ),
  );
  const exit = yield* install(run, archive);
  const asksForBase = messageOf(exit).pipe(Option.exists(Str.includes('needs a "base" URL')));
  assertTrue(asksForBase);
});

layer(fixtureLayer)("installTools", (it) => {
  it.effect("links the binary into node_modules/.bin", () => linksTheBinary);
  it.effect("records the checksum of what it downloaded", () => recordsTheChecksum);
  it.effect(
    "fetches once and reuses the cache once the checksum is locked",
    () => reusesTheCacheOnceLocked,
  );
  it.effect(
    "fails when an asset no longer matches the locked checksum",
    () => failsWhenTheAssetChanged,
  );
  it.effect("does nothing when VPA_TOOLS is false", () => skipsWhenDisabled);
  it.effect(
    "skips a tool that has no asset for this platform",
    () => skipsAToolWithoutThisPlatform,
  );
  it.effect("asks for a base URL when the name has no owner", () => needsABaseWithoutAnOwner);
});
