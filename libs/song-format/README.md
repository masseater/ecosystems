# @r_masseater/song-format

Tooling for `.fumx` songs: import a song from TypeScript with Vite, edit it with a language server, convert a MIDI file to `.fumx` with a check against the original, and print a report of its keys, chords and repeated bars.

It requires [Vite+](https://viteplus.dev/) and Node.js 26 or later. `effect` and `vite-plus` are peer dependencies. It also holds the grammar and the reader of `.fumx`.

```sh
vp add @r_masseater/song-format effect vite-plus
```

## Read a song

```ts
import { readSong } from "@r_masseater/song-format";
import { Effect } from "effect";

const text = `song "lint me"

instrument lead sample "lead.flac" root C4

track lead instrument lead

bar meter 4/4 tempo 120bpm {
  lead: C4 1/4, E4 1/4, B5 1/2 vel 0.9
  lead.cc 64: 127 1/2, 0 1/2
}
`;

const source = await Effect.runPromise(
  readSong({ path: "/song.fumx", read: () => Effect.succeed(text) }),
);
if (source.status === "valid") {
  const tooHigh = source.song.notes.filter((note) => note.midi > 79);
}
```

`readSong` follows `import` statements through `read`, so the files can come from disk, memory or a network. An invalid file gives `issues` with a path, line and column. The messages are in Japanese. `outline.comments` lists the `//` and `/* */` comments of the entry file with their line and column, so tools such as linters can read directives from them.

Times are integer ticks, `TICKS_PER_WHOLE` to a whole note; `fractionOf` prints them as `1/4`. `@r_masseater/song-format/analysis` estimates what the notes imply but the file does not write: the key of a range of bars (`keyIn`), the chord on each beat (`chordsOf`) and bars that repeat. `analyze` returns all of them for a song, and `soundingsOf` lists the notes of unmuted tracks with their track role, source line and column, and the spelling and pitch class as written. Chord names follow that spelling, so `E G C` is `CM/E`, not `Em#5`.

`@r_masseater/song-format/language` exports the Langium grammar and modules for editors and language servers.

## Import a song

Add the Vite plugin. TypeScript then reads a compiled song as a value.

```ts
import { fumx } from "@r_masseater/song-format/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({ plugins: [fumx()] });
```

```ts
import { song } from "./song.fumx";
```

The plugin writes `song.d.fumx.ts` next to each song. For the TypeScript server to follow the import, list the package as a content mapper in `tsconfig.json`.

```json
{
  "compilerOptions": { "allowArbitraryExtensions": true },
  "contentMappers": [{ "package": "@r_masseater/song-format", "extensions": [".fumx"] }]
}
```

## Commands

`song-report <file>` prints, as JSON, the keys, chords and repeated bars derived from a song file. A reader that cannot listen to the song checks what was written from this output.

`midi-to-fumx <file>` converts a Standard MIDI File to `.fumx`. It reads the written `.fumx` back, compares it with the events of the original MIDI, and fails if even one differs.

`fumx-language-server` serves the `.fumx` language over stdio for editors.

```sh
vp exec song-report song.fumx
vp exec midi-to-fumx song.mid
```

## Convert from code

```ts
import { midiToFumx } from "@r_masseater/song-format/convert-midi";
```

`midiToFumx` takes a parsed MIDI file and returns the `.fumx` text. `compareWithMidi` reports how the written song differs from the original.

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/song-format": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.

## License

[MIT](LICENSE)
