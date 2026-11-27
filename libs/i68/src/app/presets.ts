import { harmony } from "#/app/presets/features/check-harmony/index.ts";
import { pop } from "#/app/presets/features/check-pop/index.ts";
import type { PopOptions } from "#/app/presets/features/check-pop/index.ts";
import type { I68Config } from "#/shared/config/index.ts";

export { classical, classicalPlugin } from "#/app/presets/features/check-classical/index.ts";
export { DEFAULT_RANGES, pop, popPlugin } from "#/app/presets/features/check-pop/index.ts";
export type { PopOptions, Range, Ranges } from "#/app/presets/features/check-pop/index.ts";
export {
  PROGRESSIONS,
  progressions,
  progressionsPlugin,
} from "#/app/presets/features/check-progressions/index.ts";
export type { Progression } from "#/app/presets/features/check-progressions/index.ts";
export { bach, bachPlugin, stylePluginOf } from "#/app/presets/features/check-style/index.ts";
export { styleRules, styleRulesPluginOf } from "#/app/presets/features/check-habits/index.ts";
export type { StyleRulesPreset } from "#/app/presets/features/check-habits/index.ts";
export {
  HABIT_KINDS,
  StyleRulesSchema,
  subjectKeyOf,
} from "#/app/presets/shared/lib/style-rules.ts";
export type {
  HabitKind,
  HabitRule,
  StyleRules,
  Subject,
} from "#/app/presets/shared/lib/style-rules.ts";
export { mixKeyOf } from "#/app/presets/shared/lib/mix-habit.ts";
export type { MixHabit } from "#/app/presets/shared/lib/mix-habit.ts";
export type { StyleTable, Transitions } from "#/app/presets/shared/lib/style-table.ts";
export { harmony, harmonyPlugin } from "#/app/presets/features/check-harmony/index.ts";

export const recommended = (options: PopOptions = {}): I68Config => ({
  extends: [pop(options), harmony()],
});
