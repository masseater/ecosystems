import { settingOf } from "@masseater.dev/lint-host";
import { matcher, selects } from "@masseater.dev/path-kit";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type {
  Fu4Config,
  Override,
  Rule,
  RuleEntry,
  RuleOptions,
  Severity,
} from "#/shared/config/index.ts";

const SEPARATOR = "/";
const START = 0;

export interface ActiveRule {
  readonly id: string;
  readonly rule: Rule;
  readonly severity: Exclude<Severity, "off">;
  readonly options: RuleOptions;
}

interface Enabled {
  readonly id: string;
  readonly severity: Exclude<Severity, "off">;
  readonly options: RuleOptions;
}

const enabled = ([id, entry]: readonly [string, RuleEntry]): readonly Enabled[] => {
  const { severity, options } = settingOf(entry);
  if (severity === "off") {
    return [];
  }
  return [{ id, severity, options }];
};

const applies =
  (path: string) =>
  (override: Override): boolean =>
    selects(override.files)(path);

export const isIgnored =
  (config: Fu4Config) =>
  (path: string): boolean =>
    matcher(config.ignores ?? [])(path);

export const entriesFor =
  (config: Fu4Config) =>
  (path: string): Readonly<Record<string, RuleEntry>> => {
    const merged: Record<string, RuleEntry> = { ...config.rules };
    for (const override of pipe(config.overrides ?? [], Arr.filter(applies(path)))) {
      Object.assign(merged, override.rules);
    }
    return merged;
  };

const ruleOf =
  (config: Fu4Config) =>
  (id: string): Option.Option<Rule> =>
    pipe(
      Str.indexOf(SEPARATOR)(id),
      Option.flatMap((at) =>
        pipe(
          Rec.get(config.plugins ?? {}, Str.slice(START, at)(id)),
          Option.flatMap((plugin) => Rec.get(plugin.rules, Str.slice(at + SEPARATOR.length)(id))),
        ),
      ),
    );

const activate =
  (config: Fu4Config) =>
  (entry: Enabled): readonly ActiveRule[] =>
    pipe(
      ruleOf(config)(entry.id),
      Option.map((rule): ActiveRule => ({ ...entry, rule })),
      Option.toArray,
    );

export const activeRules =
  (config: Fu4Config) =>
  (path: string): readonly ActiveRule[] =>
    pipe(
      Rec.toEntries(entriesFor(config)(path)),
      Arr.flatMap(enabled),
      Arr.flatMap(activate(config)),
    );
