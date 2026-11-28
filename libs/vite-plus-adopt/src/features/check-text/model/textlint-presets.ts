import type { TextlintRcConfig } from "@textlint/config-loader";
import type { TextlintKernelFilterRule, TextlintKernelRule } from "@textlint/kernel";
import { normalizeTextlintPresetSubRuleKey } from "@textlint/utils";
import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import type { TextlintConfig } from "#/shared/config/index.ts";

const NO_OPTIONS: Readonly<Record<string, unknown>> = {};

const isRuleOptions = Predicate.or(Predicate.isBoolean, Predicate.isReadonlyObject);

/** @internal */
export const presetRulesOf = (config: TextlintConfig): TextlintKernelRule[] => {
  const settings = config.rules ?? {};
  return pipe(
    Rec.toEntries(config.presets ?? {}),
    Arr.filter(([name]) => Boolean(settings[name])),
    Arr.flatMap(([name, preset]) => {
      const userOptions = pipe(
        Option.liftPredicate(settings[name], Predicate.isReadonlyObject),
        Option.getOrElse(() => NO_OPTIONS),
      );
      return pipe(
        Rec.toEntries(preset.rules),
        Arr.map(([key, rule]) => ({
          ruleId: normalizeTextlintPresetSubRuleKey({ preset: name, rule: key }),
          rule,
          options: pipe(
            Rec.get(userOptions, key),
            Option.filter((value) => value !== true),
            Option.filter(isRuleOptions),
            Option.getOrElse(() => preset.rulesConfig[key] ?? true),
          ),
        })),
        Arr.filter(({ options }) => options !== false),
      );
    }),
  );
};

export interface FilterInput {
  readonly config: TextlintConfig;
  readonly wrap: (rule: TextlintKernelFilterRule["rule"]) => TextlintKernelFilterRule["rule"];
}

/** @internal */
export const filterRulesOf = ({ config, wrap }: FilterInput): TextlintKernelFilterRule[] => {
  const settings = config.filters ?? {};
  return pipe(
    Rec.toEntries(config.filterModules ?? {}),
    Arr.filter(([name]) => Boolean(settings[name])),
    Arr.map(([name, rule]) => ({
      ruleId: name,
      rule: wrap(rule),
      options: pipe(
        Rec.get(settings, name),
        Option.filter(isRuleOptions),
        Option.getOrElse(() => true),
      ),
    })),
  );
};

/** @internal */
export const rawConfigOf = (config: TextlintConfig): TextlintRcConfig => {
  const {
    ignores: _ignores,
    presets = {},
    filterModules = {},
    reportUnusedDirectives: _report,
    sources: _sources,
    ...rawConfig
  } = config;
  return {
    ...rawConfig,
    rules: pipe(
      rawConfig.rules ?? {},
      Rec.filter((_setting, name) => !Rec.has(presets, name)),
    ),
    filters: pipe(
      rawConfig.filters ?? {},
      Rec.filter((_setting, name) => !Rec.has(filterModules, name)),
    ),
  };
};
