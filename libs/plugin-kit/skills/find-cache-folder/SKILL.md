---
name: find-cache-folder
description: >
  Use when a Claude Code plugin hook or script must keep downloaded or built files between runs,
  such as a model, a binary or an installed tool: cacheRootOf gives the folder under
  XDG_CACHE_HOME or ~/.cache.
metadata:
  type: core
  library: "@r_masseater/plugin-kit"
sources:
  - src/app/**
  - README.md
---

# find-cache-folder

A plugin's own directory is replaced when the plugin updates, so files that are costly to fetch again belong in the user's cache folder. `cacheRootOf` gives that folder and keeps every plugin on the same rule.

## Setup

```sh
bun add @r_masseater/plugin-kit
```

Commit the `bun.lock` that `bun add` writes. Claude Code installs the dependencies of a plugin from its `package.json` and a text `bun.lock` when it caches the plugin.

## Find the folder

```ts
import { cacheRootOf } from "@r_masseater/plugin-kit";

const root = await cacheRootOf(["my-plugin", "runtime"]);
```

The folder is `$XDG_CACHE_HOME/my-plugin/runtime`, or `~/.cache/my-plugin/runtime` when `XDG_CACHE_HOME` is unset or empty. The function builds the path only and creates nothing. It rejects with `CacheRootError` when neither `XDG_CACHE_HOME` nor `HOME` (or `USERPROFILE` on Windows) is set. `cacheRootEffect` is the same lookup as an Effect: provide a `ConfigProvider` to test it with a fake environment.
