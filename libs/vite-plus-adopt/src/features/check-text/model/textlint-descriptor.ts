import { loadPackagesFromRawConfig } from "@textlint/config-loader";
import { TextlintKernelDescriptor } from "@textlint/kernel";
import type { TextlintKernelFilterRule } from "@textlint/kernel";
import { Effect, Path } from "effect";
import { loadBuiltinPlugins } from "textlint/lib/src/loader/TextlintrcLoader.js";

import type { TextlintConfig } from "#/shared/config/index.ts";
import { attempt } from "#/shared/lib/attempt.ts";
import { toolFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

import { filterRulesOf, presetRulesOf, rawConfigOf } from "./textlint-presets.ts";

export interface DescriptorInput {
  readonly root: string;
  readonly config: TextlintConfig;
  readonly wrap: (rule: TextlintKernelFilterRule["rule"]) => TextlintKernelFilterRule["rule"];
}

/** @internal */
export const descriptorOf = ({
  root,
  config,
  wrap,
}: DescriptorInput): Effect.Effect<TextlintKernelDescriptor, VpToolsError, Path.Path> =>
  Effect.gen(function* descriptor() {
    const path = yield* Path.Path;
    const loaded = yield* attempt("textlint")(() =>
      loadPackagesFromRawConfig({
        rawConfig: rawConfigOf(config),
        node_moduleDir: path.join(root, "node_modules"),
      }),
    );
    if (!loaded.ok) {
      return yield* toolFailed("textlint")(loaded.error.message);
    }
    const { rules, filterRules, plugins } = loaded.config;
    const builtIn = yield* attempt("textlint")(loadBuiltinPlugins);
    return new TextlintKernelDescriptor({
      rules: [...rules, ...presetRulesOf(config)],
      filterRules: [...filterRules, ...filterRulesOf({ config, wrap })],
      plugins: [...builtIn.plugin.toKernelPluginsFormat(), ...plugins],
      configBaseDir: root,
    });
  });
