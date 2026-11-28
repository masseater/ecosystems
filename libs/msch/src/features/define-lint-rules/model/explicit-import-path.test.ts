import { Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { mschLintPlugin } from "./plugin.ts";

const FIXTURES = new URL("./fixtures/explicit-import-path/", import.meta.url).pathname;
const TYPESCRIPT = `${FIXTURES}test.ts`;
const NESTED = `${FIXTURES}src/features/build-site/model.ts`;
const MESSAGE_ID = "spellOut";

const rule = pipe(
  Record.get(mschLintPlugin.rules, "explicit-import-path"),
  Option.getOrThrowWith(() => new Error("rule explicit-import-path is missing")),
);

type Reported = Readonly<Record<"specifier" | "fixed", string>>;

const acceptedIn =
  (filename: string) =>
  (code: string): RuleTester.ValidTestCase => ({ code, filename });

const rejectedIn =
  (filename: string) =>
  (code: string, output: string, data: Reported): RuleTester.InvalidTestCase => ({
    code,
    output,
    filename,
    errors: [{ messageId: MESSAGE_ID, data }],
  });

const accepted = acceptedIn(TYPESCRIPT);
const rejected = rejectedIn(TYPESCRIPT);
const acceptedNested = acceptedIn(NESTED);
const rejectedNested = rejectedIn(NESTED);

RuleTester.describe = (text, run): void => {
  describe(text, () => {
    run();
  });
};
RuleTester.it = (text, run): void => {
  it(text, () => {
    run();
  });
};

const tester = new RuleTester({
  languageOptions: { sourceType: "module", parserOptions: { lang: "ts" } },
});

tester.run("explicit-import-path with the eslint-plugin-n file-extension-in-import cases", rule, {
  valid: [
    accepted("import 'eslint'"),
    accepted("import '@typescript-eslint/parser'"),
    accepted("import 'punycode/'"),
    accepted("import 'xxx'"),
    accepted("import './a.ts'"),
    accepted("import './b.json'"),
    accepted("import './d.tsx'"),
    accepted("import '@apollo/client/core'"),
    accepted("import 'yargs/helpers'"),
    accepted("import 'firebase-functions/v1/auth'"),
    accepted("require('./a.ts');"),
  ],
  invalid: [
    rejected("import './a'", "import './a.ts'", { specifier: "./a", fixed: "./a.ts" }),
    rejected("import './d'", "import './d.tsx'", { specifier: "./d", fixed: "./d.tsx" }),
    rejected("import { util } from './my-folder'", "import { util } from './my-folder/index.ts'", {
      specifier: "./my-folder",
      fixed: "./my-folder/index.ts",
    }),
    rejected("import { util } from './my-folder/'", "import { util } from './my-folder/index.ts'", {
      specifier: "./my-folder/",
      fixed: "./my-folder/index.ts",
    }),
    rejected("import './multi'", "import './multi.ts'", {
      specifier: "./multi",
      fixed: "./multi.ts",
    }),
    rejected("import './utils.client'", "import './utils.client.ts'", {
      specifier: "./utils.client",
      fixed: "./utils.client.ts",
    }),
    rejected("import './util.client'", "import './util.client.ts'", {
      specifier: "./util.client",
      fixed: "./util.client.ts",
    }),
    rejected("import './my-things.client'", "import './my-things.client/index.ts'", {
      specifier: "./my-things.client",
      fixed: "./my-things.client/index.ts",
    }),
    rejected("function f() { import('./a') }", "function f() { import('./a.ts') }", {
      specifier: "./a",
      fixed: "./a.ts",
    }),
  ],
});

tester.run("explicit-import-path with every kind of module reference", rule, {
  valid: [
    accepted("import type { Value } from './a.ts';"),
    accepted("export * from './a.ts';"),
    accepted("export { value } from './a.ts';"),
    accepted("export * as all from './a.ts';"),
    accepted("const load = () => import('./a.ts');"),
    accepted("import data from './b.json' with { type: 'json' };"),
    accepted("import './missing';"),
    accepted("import '#/features/build-site/index.ts';"),
    accepted("import './a.ts?raw';"),
    accepted("import 'node:path';"),
    accepted('const load = (name: string) => import("./" + name);'),
  ],
  invalid: [
    rejected("import type { Value } from './a';", "import type { Value } from './a.ts';", {
      specifier: "./a",
      fixed: "./a.ts",
    }),
    rejected("export * from './a';", "export * from './a.ts';", {
      specifier: "./a",
      fixed: "./a.ts",
    }),
    rejected('export { value } from "./a";', 'export { value } from "./a.ts";', {
      specifier: "./a",
      fixed: "./a.ts",
    }),
    rejected(
      "export * as all from './my-folder';",
      "export * as all from './my-folder/index.ts';",
      {
        specifier: "./my-folder",
        fixed: "./my-folder/index.ts",
      },
    ),
    rejected("const load = () => import('./a');", "const load = () => import('./a.ts');", {
      specifier: "./a",
      fixed: "./a.ts",
    }),
    rejected("import { value } from '.';", "import { value } from './index.ts';", {
      specifier: ".",
      fixed: "./index.ts",
    }),
  ],
});

tester.run("explicit-import-path with parent directories", rule, {
  valid: [acceptedNested("import '../../../a.ts';")],
  invalid: [
    rejectedNested("import '../../../a';", "import '../../../a.ts';", {
      specifier: "../../../a",
      fixed: "../../../a.ts",
    }),
    rejectedNested("import '..';", "import '../index.ts';", {
      specifier: "..",
      fixed: "../index.ts",
    }),
    rejectedNested("import '../build-site';", "import '../build-site/index.ts';", {
      specifier: "../build-site",
      fixed: "../build-site/index.ts",
    }),
  ],
});
