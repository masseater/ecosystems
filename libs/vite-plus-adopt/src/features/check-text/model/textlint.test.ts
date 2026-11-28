import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue } from "@effect/vitest/utils";
import { Effect, String as Str } from "effect";

import type { TextlintPreset } from "#/shared/config/index.test.support.ts";
import type { TextlintConfig } from "#/shared/config/index.ts";
import { NO_FOO_RULE, directoryWith, lines } from "#/shared/lib/fixture.test.support.ts";
import { toJson } from "#/shared/lib/json.ts";

import { lintTexts } from "./textlint.ts";

const NO_BAR_RULE = lines(
  'import type { TextlintRuleModule } from "@textlint/types";',
  "",
  "const rule: TextlintRuleModule = (context) => ({",
  "  [context.Syntax.Str](node) {",
  '    if (context.getSource(node).includes("bar")) {',
  '      context.report(node, new context.RuleError("bar is not allowed"));',
  "    }",
  "  },",
  "});",
  "",
  "export default rule;",
);

const TYPESCRIPT_FILES = {
  "node_modules/textlint-rule-no-bar/package.json": toJson({
    name: "textlint-rule-no-bar",
    type: "module",
    main: "./src/index.ts",
  }),
  "node_modules/textlint-rule-no-bar/src/index.ts": NO_BAR_RULE,
  "bar.md": "# Bar\n\nThis line says bar.\n",
};

const FILES = {
  "node_modules/textlint-rule-no-foo/package.json": toJson({
    name: "textlint-rule-no-foo",
    main: "index.js",
  }),
  "node_modules/textlint-rule-no-foo/index.js": NO_FOO_RULE,
  "clean.md": "# Clean\n\nNothing to see here.\n",
  "dirty.md": "# Dirty\n\nThis line says foo.\n",
};

const NO_FOO = { rules: { "no-foo": true } };

const reportsBrokenRules = Effect.gen(function* reportsBrokenRules() {
  const root = yield* directoryWith(FILES);
  const report = yield* lintTexts(NO_FOO, root, ["clean.md", "dirty.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("foo is not allowed")(report.output));
  assertTrue(Str.includes("dirty.md")(report.output));
  assertFalse(Str.includes("clean.md")(report.output));
});

const passesCleanFiles = Effect.gen(function* passesCleanFiles() {
  const root = yield* directoryWith(FILES);
  assertTrue((yield* lintTexts(NO_FOO, root, ["clean.md"])).valid);
});

const loadsTypeScriptRules = Effect.gen(function* loadsTypeScriptRules() {
  const root = yield* directoryWith(TYPESCRIPT_FILES);
  const report = yield* lintTexts({ rules: { "no-bar": true } }, root, ["bar.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("bar is not allowed")(report.output));
});

const noBaz: TextlintPreset["rules"][string] = (context) => ({
  [context.Syntax.Str](node): void {
    if (Str.includes("baz")(context.getSource(node))) {
      context.report(node, new context.RuleError("baz is not allowed"));
    }
  },
});

const BAZ_PRESET: TextlintPreset = { rules: { "no-baz": noBaz }, rulesConfig: { "no-baz": true } };

const BAZ_FILES = { "baz.md": "# Baz\n\nThis line says baz.\n" };

const runsGivenPresets = Effect.gen(function* runsGivenPresets() {
  const root = yield* directoryWith(BAZ_FILES);
  const config = { presets: { "preset-baz": BAZ_PRESET }, rules: { "preset-baz": true } };
  const report = yield* lintTexts(config, root, ["baz.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("baz is not allowed")(report.output));
  assertTrue(Str.includes("  baz/no-baz")(report.output));
});

const turnsOffPresetRules = Effect.gen(function* turnsOffPresetRules() {
  const root = yield* directoryWith(BAZ_FILES);
  const config = {
    presets: { "preset-baz": BAZ_PRESET },
    rules: { "preset-baz": { "no-baz": false } },
  };
  assertTrue((yield* lintTexts(config, root, ["baz.md"])).valid);
});

const DOCUMENT_START = 0;

const ignoreMarked: NonNullable<TextlintConfig["filterModules"]>[string] = (context) => ({
  [`${context.Syntax.Document}:exit`](): void {
    const text = context.getSource();
    if (Str.includes("IGNORE-FOO")(text)) {
      context.shouldIgnore([DOCUMENT_START, text.length], { ruleId: "no-foo" });
    }
  },
});

const FILTER_FILES = {
  ...FILES,
  "marked.md": "# Marked\n\nIGNORE-FOO This line says foo.\n",
  "stale.md": "# Stale\n\nIGNORE-FOO Nothing to hide.\n",
};

const FILTERED = {
  rules: { "no-foo": true },
  filterModules: { marked: ignoreMarked },
  filters: { marked: true },
};

const appliesGivenFilters = Effect.gen(function* appliesGivenFilters() {
  const root = yield* directoryWith(FILTER_FILES);
  const report = yield* lintTexts(FILTERED, root, ["marked.md", "dirty.md"]);
  assertFalse(report.valid);
  assertTrue(Str.includes("dirty.md")(report.output));
  assertFalse(Str.includes("marked.md")(report.output));
});

const reportsUnusedDirectives = Effect.gen(function* reportsUnusedDirectives() {
  const root = yield* directoryWith(FILTER_FILES);
  const quiet = yield* lintTexts(FILTERED, root, ["marked.md", "stale.md"]);
  assertTrue(quiet.valid);
  const report = yield* lintTexts({ ...FILTERED, reportUnusedDirectives: true }, root, [
    "marked.md",
    "stale.md",
  ]);
  assertFalse(report.valid);
  assertTrue(Str.includes("stale.md")(report.output));
  assertTrue(Str.includes("hides no message of no-foo")(report.output));
  assertFalse(Str.includes("marked.md")(report.output));
});

layer(fixtureLayer)("linting text", (it) => {
  it.effect("runs the filters given as modules", () => appliesGivenFilters);
  it.effect("reports a directive that hides no message", () => reportsUnusedDirectives);
  it.effect("runs the rules of presets given as modules", () => runsGivenPresets);
  it.effect("skips preset rules turned off in the config", () => turnsOffPresetRules);
  it.effect("runs the rules named in the config over Markdown files", () => reportsBrokenRules);
  it.effect("passes when no file breaks a rule", () => passesCleanFiles);
  it.effect("loads rules written in TypeScript from node_modules", () => loadsTypeScriptRules);
});
