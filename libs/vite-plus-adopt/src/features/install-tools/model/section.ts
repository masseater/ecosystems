import { Array as Arr, Config, Effect, Option, Schema, String as Str } from "effect";

import { ToolsSectionSchema } from "#/shared/config/index.ts";
import type { ToolsSection } from "#/shared/config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

const DISABLED = ["false", "0", "off"];

/** @internal */
export const decodeSection = (raw: unknown): Effect.Effect<ToolsSection, VpToolsError> =>
  Schema.decodeUnknownEffect(ToolsSectionSchema)(raw, { onExcessProperty: "error" }).pipe(
    Effect.mapError((failure) => checksFailed(`vite.config "tools": ${failure.message}`)),
  );

/** @internal */
export const toolsEnabled: Effect.Effect<boolean> = Config.option(Config.String("VPA_TOOLS")).pipe(
  Effect.map(Option.exists((value) => Arr.contains(DISABLED, Str.toLowerCase(value)))),
  Effect.map((disabled) => !disabled),
  Effect.orElseSucceed(() => true),
);
