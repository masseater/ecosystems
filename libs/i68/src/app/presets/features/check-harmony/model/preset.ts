import { definePlugin } from "#/entities/rule/index.ts";
import type { I68Config, Plugin } from "#/shared/config/index.ts";

import { chordAboveMelody } from "./chord-above-melody.ts";
import { crowdedLowMids } from "./crowded-low-mids.ts";
import { lowIntervalLimit } from "./low-interval-limit.ts";
import { semitoneClash } from "./semitone-clash.ts";
import { voiceJump } from "./voice-jump.ts";

export const harmonyPlugin: Plugin = definePlugin({
  rules: {
    "semitone-clash": semitoneClash,
    "low-interval-limit": lowIntervalLimit,
    "crowded-low-mids": crowdedLowMids,
    "chord-above-melody": chordAboveMelody,
    "voice-jump": voiceJump,
  },
});

export const harmony = (): I68Config => ({
  plugins: { harmony: harmonyPlugin },
  rules: {
    "harmony/semitone-clash": "warn",
    "harmony/low-interval-limit": "warn",
    "harmony/crowded-low-mids": "warn",
    "harmony/chord-above-melody": "warn",
    "harmony/voice-jump": "warn",
  },
});
