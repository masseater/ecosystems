# @r_masseater/song-format

Tooling for `.fumx` songs: import a song from TypeScript with Vite, edit it with a language server, convert a MIDI file to `.fumx` with a check against the original, and print a report of its keys, chords and repeated bars.

It requires [Vite+](https://viteplus.dev/) and Node.js 26 or later. `effect` and `vite-plus` are peer dependencies. The grammar and the reader live in [`@r_masseater/fumx-parser`](https://www.npmjs.com/package/@r_masseater/fumx-parser).

```sh
vp add @r_masseater/song-format effect vite-plus
```

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

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/song-format": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into `.claude/skills`.

## License

[MIT](LICENSE)
