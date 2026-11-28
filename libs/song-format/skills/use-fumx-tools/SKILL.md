---
name: use-fumx-tools
description: >
  Use when a .fumx song must be imported from TypeScript, checked or converted: the fumx Vite
  plugin, the TypeScript content mapper, song-report for keys, chords and repeated bars,
  midi-to-fumx for converting a MIDI file with a check against the original, and the language
  server.
metadata:
  type: core
  library: "@r_masseater/song-format"
sources:
  - src/**
  - bin/**
  - README.md
---

# use-fumx-tools

`.fumx` is a text format for music. This package turns it into something TypeScript, an editor and an agent can use.

## Setup

```sh
vp add @r_masseater/song-format effect vite-plus
```

## Import a song from TypeScript

```ts
import { fumx } from "@r_masseater/song-format/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({ plugins: [fumx()] });
```

Then `import { song } from "./song.fumx"` gives a typed value. Add the content mapper to `tsconfig.json` so the TypeScript server resolves it:

```json
{ "contentMappers": [{ "package": "@r_masseater/song-format", "extensions": [".fumx"] }] }
```

## Check what was written

```sh
vp exec song-report song.fumx
```

It prints the keys, chords and repeated bars as JSON. Read it to confirm that the song you wrote has the harmony and the structure you meant, since you cannot listen to it.

## Convert a MIDI file

```sh
vp exec midi-to-fumx song.mid
```

The command writes `song.fumx`, reads it back, and compares it with the events of the MIDI file. It fails if even one event differs. Do not hand edit the output to make it pass.

## Common mistakes

### Importing `.fumx` without the content mapper

Wrong: add only the Vite plugin. The build works, but the editor reports that the module has no declaration.

Correct: add the plugin and the `contentMappers` entry, and set `allowArbitraryExtensions`.
