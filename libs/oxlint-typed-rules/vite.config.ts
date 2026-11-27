import { LOCKED } from "@r_masseater/msch/locked-inputs";
import type { CheckPackageOptions, CheckResult } from "@r_masseater/vite-plus-adopt/attw";
import {
  Effect,
  Function,
  Option,
  Record,
  Array as Arr,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { defineConfig } from "vite-plus";

import { toJson } from "./src/shared/lib/json.ts";
import { upstreamRemotionRules } from "./upstream/remotion-modules.ts";

const local = (path: string): string => new URL(path, import.meta.url).pathname;

const checkWithVpTools = (
  tarball: Uint8Array,
  options: CheckPackageOptions,
): Effect.Effect<CheckResult> =>
  Effect.promise(() => import("@r_masseater/vite-plus-adopt/attw")).pipe(
    Effect.flatMap((attw) =>
      Effect.promise(() => attw.checkPackage(attw.createPackageFromTarballData(tarball), options)),
    ),
  );

const attwModule = {
  createPackageFromTarballData: Function.identity,
  checkPackage: (tarball: Uint8Array, options: CheckPackageOptions): Promise<CheckResult> =>
    Effect.runPromise(checkWithVpTools(tarball, options)),
};

const VIRTUAL_TYPESCRIPT = "\0typescript-default";
const TS_COMPAT = toJson(local("src/shared/lib/ts-compat.ts"));

const moduleSource = (...lines: readonly string[]): string => Arr.join(lines, "\n");

const pluginImport = (path: string): string => `import plugin from ${toJson(local(path))};`;

const TYPESCRIPT_DEFAULT_MODULE = moduleSource(
  `import { ts } from ${TS_COMPAT};`,
  `export * from ${TS_COMPAT};`,
  "export default ts;",
);

const shims: Readonly<Record<string, string>> = {
  "ts-api-utils": local("src/shared/lib/ts-api-utils.ts"),
  "@typescript-eslint/utils": local("src/shared/lib/typescript-eslint-utils.ts"),
  "@typescript-eslint/typescript-estree": local(
    "node_modules/@typescript-eslint/typescript-estree/dist/simple-traverse.js",
  ),
};

const shimAliases = pipe(
  Rec.toEntries(shims),
  Arr.map(([name, replacement]) => ({
    find: new RegExp(`^${name}$`, "u"),
    replacement,
  })),
);

const UPSTREAM_REACT_SPEC =
  /\/upstream\/react\/plugins\/eslint-plugin-react-(?<plugin>[a-z-]+)\/src\/rules\/(?<rule>[^/]+)\/[^/]+\.spec\.ts$/u;

const VIRTUAL_RULE = "\0upstream-react-rule:";

const ruleParts = ({
  plugin,
  rule,
}: Readonly<Record<string, string | undefined>>): Option.Option<{
  readonly plugin: string;
  readonly rule: string;
}> => Option.all({ plugin: Option.fromNullishOr(plugin), rule: Option.fromNullishOr(rule) });

const upstreamRuleOf = (id: string, importer: string): Option.Option<string> =>
  Option.fromNullishOr(UPSTREAM_REACT_SPEC.exec(importer)).pipe(
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(ruleParts),
    Option.filter(({ rule }) => id === `./${rule}`),
    Option.map(({ plugin, rule }) => `${VIRTUAL_RULE}${plugin}/${rule}`),
  );

const afterPrefix = (prefix: string, id: string): Option.Option<string> =>
  Option.liftPredicate(id, (candidate) => Str.startsWith(prefix)(candidate)).pipe(
    Option.map(Str.slice(prefix.length)),
  );

const ruleModule =
  (prefix: string, build: (rule: { readonly plugin: string; readonly rule: string }) => string) =>
  (id: string): Option.Option<string> =>
    afterPrefix(prefix, id).pipe(
      Option.map((rest) => Str.split(rest, "/")),
      Option.flatMap(([plugin, rule]) => ruleParts({ plugin, rule })),
      Option.map(build),
    );

const upstreamRuleModule = ruleModule(VIRTUAL_RULE, ({ plugin, rule }) =>
  moduleSource(
    pluginImport("src/app/react.ts"),
    `export const RULE_NAME = ${toJson(rule)};`,
    `export default plugin.rules[${toJson(`${plugin}-${rule}`)}];`,
  ),
);

const upstreamReactRules = {
  name: "upstream-react-rules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap((spec) => upstreamRuleOf(id, spec)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(upstreamRuleModule(id)),
} as const;

const UPSTREAM_TANSTACK_TEST =
  /\/upstream\/tanstack-(?<plugin>query|router)\/src\/__tests__\/[^/]+\.ts$/u;

const UPSTREAM_TANSTACK_RULE = /^\.\.\/rules\/(?<rule>[^/]+)\/\k<rule>\.rule$/u;

const VIRTUAL_TANSTACK_RULE = "\0upstream-tanstack-rule:";

const VIRTUAL_PARSER = "\0upstream-typescript-eslint-parser";

const upstreamSource = (plugin: string, path: string): string =>
  local(`node_modules/@tanstack/eslint-plugin-${plugin}/src/${path}.ts`);

const groupOf = (pattern: Readonly<RegExp>, name: string, text: string): Option.Option<string> =>
  Option.fromNullishOr(pattern.exec(text)).pipe(
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Record.get(groups, name)),
  );

const tanstackPluginOf = (importer: string): Option.Option<string> =>
  groupOf(UPSTREAM_TANSTACK_TEST, "plugin", importer);

const tanstackRuleOf = (id: string): Option.Option<string> =>
  groupOf(UPSTREAM_TANSTACK_RULE, "rule", id);

const tanstackModuleOf = (plugin: string, id: string): Option.Option<string> =>
  afterPrefix("../", id).pipe(
    Option.map((inside) =>
      tanstackRuleOf(`../${inside}`).pipe(
        Option.match({
          onSome: (rule) => `${VIRTUAL_TANSTACK_RULE}${plugin}/${rule}`,
          onNone: () => upstreamSource(plugin, inside),
        }),
      ),
    ),
    Option.orElse(() =>
      Option.liftPredicate(VIRTUAL_PARSER, () => id === "@typescript-eslint/parser"),
    ),
  );

const tanstackRules = ruleModule(VIRTUAL_TANSTACK_RULE, ({ plugin, rule }) =>
  moduleSource(
    pluginImport(`src/app/tanstack-${plugin}.ts`),
    `export * from ${toJson(upstreamSource(plugin, `rules/${rule}/${rule}.rule`))};`,
    `export const name = ${toJson(rule)};`,
    `export const rule = plugin.rules[${toJson(rule)}];`,
  ),
);

const tanstackRuleModule = (id: string): Option.Option<string> =>
  tanstackRules(id).pipe(
    Option.orElse(() =>
      Option.liftPredicate('export const meta = { name: "oxc" };', () => id === VIRTUAL_PARSER),
    ),
  );

const upstreamTanstackModules = {
  name: "upstream-tanstack-modules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap(tanstackPluginOf),
      Option.flatMap((plugin) => tanstackModuleOf(plugin, id)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(tanstackRuleModule(id)),
} as const;

const UPSTREAM_DRIZZLE_TEST = /\/upstream\/drizzle\/tests\/[^/]+\.ts$/u;

const UPSTREAM_DRIZZLE_RULE = /^\.\.\/src\/(?<rule>[a-z-]+)$/u;

const VIRTUAL_DRIZZLE_RULE = "\0upstream-drizzle-rule:";

const drizzleRuleOf = (id: string, importer: string): Option.Option<string> =>
  Option.liftPredicate(importer, (candidate) => UPSTREAM_DRIZZLE_TEST.test(candidate)).pipe(
    Option.flatMap(() => groupOf(UPSTREAM_DRIZZLE_RULE, "rule", id)),
    Option.map((rule) => `${VIRTUAL_DRIZZLE_RULE}${rule}`),
  );

const drizzleRuleModule = (id: string): Option.Option<string> =>
  afterPrefix(VIRTUAL_DRIZZLE_RULE, id).pipe(
    Option.map((rule) =>
      moduleSource(
        pluginImport("src/app/drizzle.ts"),
        `export default plugin.rules[${toJson(rule)}];`,
      ),
    ),
  );

const typescriptDefault = {
  name: "typescript-default-export",
  enforce: "pre",
  resolveId: (id: string): string | undefined =>
    Option.getOrUndefined(Option.liftPredicate(VIRTUAL_TYPESCRIPT, () => id === "typescript")),
  load: (id: string): string | undefined =>
    Option.getOrUndefined(
      Option.liftPredicate(TYPESCRIPT_DEFAULT_MODULE, () => id === VIRTUAL_TYPESCRIPT),
    ),
} as const;

const upstreamDrizzleRules = {
  name: "upstream-drizzle-rules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap((spec) => drizzleRuleOf(id, spec)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(drizzleRuleModule(id)),
} as const;

export default defineConfig({
  msch: {
    publish: { installSize: "0 B" },
    devDependencies: {
      "上流の ESLint プラグインのコードが eslint の型を読む": {
        dependencies: ["eslint"],
      },
    },
    lint: {
      ignorePatterns: [
        "upstream/src/__tests__/**",
        "upstream/react/**",
        "upstream/{tanstack-*,drizzle,remotion}/**",
      ],
    },
  },
  plugins: [
    upstreamReactRules,
    upstreamTanstackModules,
    upstreamDrizzleRules,
    upstreamRemotionRules,
    typescriptDefault,
  ],
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["test", "size"] },
      build: {
        command: "vp pack",
        cache: { input: [...LOCKED.input, "!.fixtures", "!.fixtures/**"] },
      },
      test: { command: "vp test run", dependsOn: ["build"], cache: LOCKED },
      size: { command: "size-limit", dependsOn: ["build"] },
    },
  },
  pack: {
    entry: [
      "src/app/index.ts",
      "src/app/tanstack-start.ts",
      "src/app/tanstack-query.ts",
      "src/app/tanstack-router.ts",
      "src/app/drizzle.ts",
      "src/app/remotion.ts",
      "src/app/react.ts",
    ],
    platform: "node",
    sourcemap: true,
    alias: shims,
    deps: {
      alwaysBundle: [/^(?!effect(?:\/|$)|typescript\/)/u],
      neverBundle: [/^(?:effect(?:\/|$)|typescript\/)/u],
    },
    dts: { generator: "oxc" },
    publint: { strict: true },
    attw: { module: attwModule, profile: "esm-only", level: "error" },
  },
  resolve: {
    alias: [
      ...shimAliases,
      { find: "@typescript-eslint/rule-tester", replacement: local("upstream/rule-tester.ts") },
      { find: "@local/testkit", replacement: local("upstream/react-testkit.ts") },
      { find: "./create-rule-tester", replacement: local("upstream/remotion-testkit.ts") },
      {
        find: "../rules/no-async-client-component/no-async-client-component.rule",
        replacement: local("upstream/rules/no-async-client-component.ts"),
      },
      {
        find: "../rules/no-client-code-in-server-component/no-client-code-in-server-component.rule",
        replacement: local("upstream/rules/no-client-code-in-server-component.ts"),
      },
      { find: /^vitest$/u, replacement: "vite-plus/test" },
    ],
  },
  test: {
    globals: true,
    testTimeout: 120_000,
    server: {
      deps: {
        inline: [
          /@tanstack\/eslint-plugin-/u,
          "eslint-plugin-drizzle",
          "@remotion/eslint-plugin",
          /@eslint-react\//u,
          /eslint-plugin-react-/u,
        ],
      },
    },
    include: [
      "src/**/*.test.ts",
      "upstream/src/__tests__/*.test.ts",
      "upstream/tanstack-query/src/__tests__/*.test.ts",
      "upstream/tanstack-router/src/__tests__/*.test.ts",
      "upstream/drizzle/tests/*.test.ts",
      "upstream/remotion/src/tests/*.test.ts",
      "upstream/react/plugins/**/*.spec.ts",
    ],
  },
});
