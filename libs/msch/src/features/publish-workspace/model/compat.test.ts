import { Option } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { compatCasesOf, smokeTargetsOf, viteAliasOf } from "./compat-manifest.ts";
import type { CompatManifest } from "./compat-manifest.ts";

const manifest = (fields: Partial<CompatManifest>): CompatManifest => ({
  name: "@scope/pkg",
  version: "1.0.0",
  ...fields,
});

describe("compat cases", () => {
  test("a package without engines.node has no range to check", () => {
    expect(compatCasesOf(manifest({}))).toStrictEqual([]);
  });

  test("the floor case runs the newest patch of the lowest Node.js and peer minors", () => {
    const [floor] = compatCasesOf(
      manifest({
        engines: { node: ">=26.0.0" },
        peerDependencies: { effect: "^4.1.2", "vite-plus": "^1.5.0" },
      }),
    );
    expect(floor).toStrictEqual({
      label: "floor",
      node: "~26.0.0",
      peers: { effect: "~4.1.0", "vite-plus": "~1.5.0" },
    });
  });

  test("the latest case runs the newest release of the same major with the declared peer ranges", () => {
    const [, latest] = compatCasesOf(
      manifest({ engines: { node: ">=26.0.0" }, peerDependencies: { effect: "^4.1.2" } }),
    );
    expect(latest).toStrictEqual({
      label: "latest",
      node: "^26",
      peers: { effect: "^4.1.2" },
    });
  });

  test("a peer range that semver cannot read is left out of the floor case", () => {
    const [floor] = compatCasesOf(
      manifest({ engines: { node: ">=26" }, peerDependencies: { odd: "workspace:^" } }),
    );
    expect(floor).toStrictEqual({ label: "floor", node: "~26.0.0", peers: {} });
  });
});

describe("compat cases with a vite peer", () => {
  test("a vite peer is left to the vite that vite-plus brings in, as in a repository set up by vite-plus-adopt", () => {
    expect(
      compatCasesOf(
        manifest({
          engines: { node: ">=26.0.0" },
          peerDependencies: { vite: "*", "vite-plus": "^1.8.0" },
        }),
      ),
    ).toStrictEqual([
      { label: "floor", node: "~26.0.0", peers: { "vite-plus": "~1.8.0" } },
      { label: "latest", node: "^26", peers: { "vite-plus": "^1.8.0" } },
    ]);
  });

  test("a vite peer without vite-plus is installed as declared", () => {
    const [, latest] = compatCasesOf(
      manifest({ engines: { node: ">=26.0.0" }, peerDependencies: { vite: "^8.0.0" } }),
    );
    expect(latest).toStrictEqual({ label: "latest", node: "^26", peers: { vite: "^8.0.0" } });
  });
});

describe("the vite that vite-plus brings in", () => {
  test("is installed at the top of the consumer under the name vite, as vite-plus-adopt does", () => {
    const text =
      '{"dependencies":{"vite":"npm:@voidzero-dev/vite-plus-core@8.3.8001","oxlint":"=1.94.0"}}';
    expect(viteAliasOf(text)).toStrictEqual(
      Option.some("vite@npm:@voidzero-dev/vite-plus-core@8.3.8001"),
    );
  });

  test("is left alone when vite-plus declares no vite", () => {
    expect(viteAliasOf('{"dependencies":{"oxlint":"=1.94.0"}}')).toStrictEqual(Option.none());
    expect(viteAliasOf('{"name":"vite-plus"}')).toStrictEqual(Option.none());
  });

  test("is left alone when the manifest cannot be read", () => {
    expect(viteAliasOf("not json")).toStrictEqual(Option.none());
  });
});

describe("smoke targets", () => {
  test("imports every published subpath except package.json and patterns", () => {
    const targets = smokeTargetsOf(
      manifest({
        exports: { ".": "./src/a.ts" },
        publishConfig: {
          exports: {
            ".": "./dist/index.mjs",
            "./vite": "./dist/vite.mjs",
            "./presets/*": "./presets/*",
            "./package.json": "./package.json",
          },
        },
      }),
    );
    expect(targets.imports).toStrictEqual(["@scope/pkg", "@scope/pkg/vite"]);
  });

  test("runs every published bin", () => {
    const targets = smokeTargetsOf(
      manifest({
        bin: { tool: "./bin/tool.ts" },
        publishConfig: { bin: { tool: "./dist/tool.mjs", other: "./dist/other.mjs" } },
      }),
    );
    expect(targets.bins).toStrictEqual(["./dist/tool.mjs", "./dist/other.mjs"]);
  });

  test("falls back to the source exports and bin when publishConfig has none", () => {
    const targets = smokeTargetsOf(manifest({ exports: { ".": "./index.js" }, bin: "./cli.js" }));
    expect(targets).toStrictEqual({ imports: ["@scope/pkg"], bins: ["./cli.js"] });
  });
});

describe("types-only exports", () => {
  test("are not imported because they have no runtime entry", () => {
    const targets = smokeTargetsOf(
      manifest({
        publishConfig: {
          exports: {
            ".": { types: "./a.d.ts", default: "./a.js" },
            "./vite": { types: "./vite.d.ts" },
          },
        },
      }),
    );
    expect(targets.imports).toStrictEqual(["@scope/pkg"]);
  });
});
