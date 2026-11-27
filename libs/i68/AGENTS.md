# @r_masseater/i68

This workspace is the linter for `.fumx` songs. It reads each song with `@r_masseater/song-format`, resolves the `i68` section of vite.config.ts, runs the rules of the configured plugins and applies `i68-ignore` comments. The engine layers hold no rules of their own; the official rules are the presets in `src/app/presets.ts`, published as `@r_masseater/i68/presets`.

- The parser is TypeScript, so the engine is TypeScript with no native code. Move work to Rust only when OTel spans (`i68.read`, `i68.rules`, `i68.rule`) show TypeScript is too slow.

- The presets are one per concern: `pop`, `harmony`, `classical`, `progressions` and `bach`, and `recommended`, which extends `pop` and `harmony`. They use only the rule API and the analysis of `@r_masseater/song-format`, so they ship as plain TypeScript.
- Add a new style of writing music as a new preset and plugin under `src/app/presets/features/check-<style>/`, not as options on an existing one.
- Every rule warns by default and its `detail` says how to fix the finding.
- Before changing a threshold, run the presets on real songs and compare the counts.
- `bach` reads a precomputed table of chord transitions. Regenerate it with `vp run build-style-tables`, which downloads the corpus; commit only the table, never the scores.
- `vp run find-habits -- <songs...> --against <baseline>` reads the songs of one style (`.fumx` or Ableton `.als`) and lists the chord changes they share that the baseline rarely makes, with where each one occurs. The baseline is `bach` or a Chordonomicon genre table (`all`, `pop`, `rock` and so on). It is a development tool and is not published.
- `vp run build-genre-tables` downloads Chordonomicon and writes its genre tables to `$XDG_CACHE_HOME/i68/chordonomicon/`. Chordonomicon is CC BY-NC, so never commit the corpus or the tables and never ship them in a preset.
