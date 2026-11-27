# @r_masseater/i68

A linter for `.fumx` songs, configured from `vite.config.ts`.

`.fumx` writes music as text, so the habits a composer keeps can be checked like code: notes outside the key, a part above what its singer can reach, two parts clashing a semitone apart. i68 reads each song with [`@r_masseater/song-format`](https://www.npmjs.com/package/@r_masseater/song-format), runs rules written in TypeScript over its notes, and prints each finding with its file, line and column.

```sh
vp add -D @r_masseater/i68 effect
```

```ts
import "@r_masseater/i68/vite";
import { recommended } from "@r_masseater/i68/presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  i68: {
    extends: [recommended({ ranges: { lead: ["A3", "E5"] } })],
    rules: { "harmony/chord-above-melody": "off" },
  },
});
```

```sh
vp exec i68            # every .fumx file git tracks
vp exec i68 songs/     # only these paths
```

The official rules live in the `@r_masseater/i68/presets` subpath, one preset per concern.

## Rules

A rule gets the song, the notes that sound (with their track role, source line and column) and its options, and reports what it finds.

```ts
import { definePlugin, defineRule } from "@r_masseater/i68";

const noHighBass = defineRule({
  meta: { description: "The bass stays at or below C3" },
  check: (context) => {
    for (const note of context.soundings) {
      if (note.track === "bass" && note.midi > 48) {
        context.report({ line: note.line, column: note.column, message: "The bass is too high" });
      }
    }
  },
});

export const local = definePlugin({ rules: { "no-high-bass": noHighBass } });
```

Register a plugin under a name in `plugins` and its rules become `<name>/<rule>`. A rule is on as an error unless `rules` sets it to `"warn"`, `"off"` or `["warn", { ...options }]`. A later config that sets only the severity keeps the options an earlier one gave, as in ESLint. Naming a plugin or a rule that is not registered, or a rule that throws, stops the run with an error.

## Ignoring a finding

When a passage breaks a rule on purpose, say so in the file, and write why after `--`:

```fumx
lead: C5 1/2, F#5 1/2  // i68-ignore pop/out-of-key -- borrowed from the parallel minor
// i68-ignore-next-line harmony/semitone-clash
pad: [B4 C5] 1/1
// i68-disable pop/melody-leap -- the chorus jumps on purpose
...
// i68-enable pop/melody-leap
// i68-ignore-file classical/parallel-perfects
```

Directives follow ESLint's: they start the comment, `//` or `/* */`, and separate rule names with commas. `i68-ignore` covers its own line, `i68-ignore-next-line` the line after it, and `i68-ignore-file` the whole file. `i68-disable` covers everything after it until the matching `i68-enable`, or to the end of the file. A comment without rule names covers every rule.

## Programmatic use

`lint({ root, files, read, config })` lints files through your own `read`. `lintText({ path, text, config })` lints one song held in memory, for editors and tests. Both return diagnostics with `path`, `line`, `column`, `rule`, `severity`, `message` and `detail`.

## Presets

Pick the presets that match how you write, or take `pop` and `harmony` together with `recommended()`. Every rule warns rather than fails.

## pop

For songs with a lead vocal. `pop({ ranges, maxLeap, breathSeconds })`.

| Rule              | What it catches                                                                                                            | How to fix it                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pop/out-of-key`  | A note outside both the key the section implies and the chord under it, except a short chromatic passing or neighbour note | Move it a semitone, or ignore the line if the borrowed note is intended |
| `pop/part-range`  | A note outside its part's range (melody C3-C6, bass E1-C4 unless set per track)                                            | Move the phrase an octave, or set `ranges`                              |
| `pop/melody-leap` | A melody jump over an octave                                                                                               | Make it smaller, or step back the other way right after it              |
| `pop/breath`      | A sung line longer than 8 seconds without a rest                                                                           | Put a short rest in the phrase                                          |

## harmony

How chords and parts sound together: voicing, spacing and clashes. `harmony()`.

| Rule                         | What it catches                                                                      | How to fix it                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `harmony/semitone-clash`     | Two parts a minor 2nd or minor 9th apart, except a dominant's flat 9th over its bass | Move one of them to a chord note                          |
| `harmony/low-interval-limit` | A close interval below the pitch where it turns muddy (a 3rd below C3)               | Widen it or move the upper note up an octave              |
| `harmony/crowded-low-mids`   | More than 3 notes at once between A2 and B3                                          | Thin the chord or move notes out of that range            |
| `harmony/chord-above-melody` | A harmony part above the lead melody                                                 | Keep the chord below the melody                           |
| `harmony/voice-jump`         | A chord voice that leaps more than a major 3rd into the next chord                   | Keep shared notes and move each voice to the nearest note |

## classical

Common-practice part writing, off unless you add it. `classical()`.

| Rule                              | What it catches                                                  | How to fix it                  |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| `classical/parallel-perfects`     | Melody and bass moving in parallel fifths or octaves             | Move one of them the other way |
| `classical/unresolved-dissonance` | A dissonant melody note on a strong beat that does not step down | Move the next note down a step |

## progressions

Points out well-known chord progressions so you can see where a song leans on one. `progressions()`.

| Rule                 | What it catches                                                                                   | How to fix it                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `progressions/named` | Marusa (IVM7 III7 VIm7), Oudou (IV V IIIm VIm), Komuro (VIm IV V I), Canon, ii–V–I and Andalusian | Nothing to fix; change a chord if you do not want that progression |

Matching ignores sevenths, so IV V IIIm VIm and IVM7 V7 IIIm7 VIm7 are both Oudou. `PROGRESSIONS` lists them.

## bach

Compares each chord change with what Bach did in his 370 four-part chorales. `bach()`.

| Rule                   | What it catches                                                                   | How to fix it                                            |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `bach/rare-transition` | A chord change that Bach makes less than 3% of the time after the same 1-3 chords | Use one of the chords the detail says Bach usually picks |

Chords are read as degrees of the key each section implies, so the table works in any key. Minor keys are read as their relative major. The rule looks at the last 1-3 chords and uses the longest of them that the table has seen at least 8 times. Set `["warn", { share, seen }]` to change both numbers.

The table in `src/app/presets/features/check-style/data/bach-chorales.json` holds only counts of chord transitions. `vp run build-style-tables` builds it from the Humdrum kern files of [craigsapp/bach-370-chorales](https://github.com/craigsapp/bach-370-chorales). The scores themselves are not in this package. For another composer, build a `StyleTable` the same way and pass it to `stylePluginOf(table)`.

Rules find parts by the `role` of their track (`melody`, `countermelody`, `harmony`, `bass`, `drums`), so give each track a role.

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/i68": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.
