import BACH_CHORALES from "#/app/presets/features/check-style/data/bach-chorales.json" with { type: "json" };
import type { StyleTable } from "#/app/presets/shared/lib/style-table.ts";

export {
  DEFAULT_LIMITS,
  UnreadableSong,
  habitsOf,
  mixHabitsOf,
  styleSongFromText,
} from "#/app/presets/features/find-habits/index.ts";
export type {
  Habit,
  HabitInput,
  HabitLimits,
  MixHabitFound,
  Place,
  SongText,
  StyleSong,
} from "#/app/presets/features/find-habits/index.ts";
export {
  HABIT_KINDS,
  StyleRulesSchema,
  SubjectSchema,
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
export { StyleTableSchema } from "#/app/presets/shared/lib/style-table.ts";
export type { StyleTable } from "#/app/presets/shared/lib/style-table.ts";

export const BACH_TABLE: StyleTable = BACH_CHORALES;
