---
name: import-custom-format
description: >
  Use when TypeScript must import a file in a custom format with editor support: describing the
  mapping as segments (text, verbatim, alias, atom), producing ts-content-mapper output with
  mappedOutput, and loading the file as a module with the contentImport Vite plugin.
metadata:
  type: core
  library: "@r_masseater/mapped-import"
sources:
  - src/**
  - README.md
---

# import-custom-format

Importing `./song.my` from TypeScript needs two things: a module Vite can load, and a mapping the TypeScript server can follow. This library gives both from one description of the file.

## Setup

```sh
vp add @r_masseater/mapped-import effect vite-plus
```

## Describe the file as segments

```ts
import { nameLiteral, renderSegments, text } from "@r_masseater/mapped-import";
import { Option } from "effect";

const segments = [
  text("export const "),
  ...nameLiteral({ name: "greeting", span: Option.some({ start: 0, end: 8 }) }),
];
const declaration = renderSegments({ content: "greeting", segments });
```

Use `verbatim` for text copied from the file, `alias` for text that stands for a span, `atom` for text that must be treated as one unit, and `text` for text with no source.

## Load it in Vite

```ts
import { contentImport } from "@r_masseater/mapped-import/vite";
import { Effect, Option } from "effect";

export const plugin = contentImport({
  name: "my-format",
  extension: ".my",
  load: ({ content }) =>
    Effect.succeed({
      code: `export default ${JSON.stringify(content)};`,
      declaration: Option.none(),
      watchFiles: [],
    }),
});
```

When `declaration` is set, it is written to `<file>.d.my.ts` only if it changed.

## Map for the TypeScript server

```ts
import { mappedOutput } from "@r_masseater/mapped-import/mapper";
```

Pass the request and the mapped result. Errors need a `fallback` text, so the server still has something to type check.

## Common mistakes

### Writing the declaration yourself

Wrong: write `<file>.d.my.ts` in `load` with the file system.

Correct: return it as `declaration` and let the plugin write it only when it changed.
