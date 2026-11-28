---
name: read-hook-input
description: >
  Use when a Claude Code plugin hook or script must read JSON it did not write, such as a hook
  payload on stdin or a settings file: parseJson to parse without throwing and isRecord to narrow
  the result to a plain object.
metadata:
  type: core
  library: "@r_masseater/plugin-kit"
  library_version: 0.1.0
sources:
  - src/app/**
  - README.md
---

# read-hook-input

A hook payload comes from outside the hook, so its shape is not guaranteed. `parseJson` and `isRecord` read it without a cast and without a thrown error.

## Setup

```sh
bun add @r_masseater/plugin-kit
```

Commit the `bun.lock` that `bun add` writes. Claude Code installs the dependencies of a plugin from its `package.json` and a text `bun.lock` when it caches the plugin.

## Read a payload

```ts
import { isRecord, parseJson } from "@r_masseater/plugin-kit";

const parsed = parseJson(text);
if (parsed._tag === "Some" && isRecord(parsed.value)) {
  console.log(parsed.value["tool_name"]);
}
```

`parseJson` returns `{ _tag: "None" }` when the text is not JSON and never throws. `isRecord` is false for `null`, arrays and primitives, so check it before reading keys.
