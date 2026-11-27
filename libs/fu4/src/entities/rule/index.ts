export { definePlugin, defineRule } from "./model/define.ts";
export { flattenConfig } from "./model/extend.ts";
export { activeRules, isIgnored } from "./model/resolve.ts";
export type { ActiveRule } from "./model/resolve.ts";
export { INPUT_KINDS } from "#/shared/config/index.ts";
export type { Rule, RuleContext } from "#/shared/config/index.ts";
