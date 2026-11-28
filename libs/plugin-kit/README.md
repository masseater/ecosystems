# @r_masseater/plugin-kit

Shared code for Claude Code plugin hooks and scripts: read untrusted JSON and find the cache folder.

It requires Node.js 26 or later. It bundles the little of Effect it needs, so installing it adds no other package.

```sh
bun add @r_masseater/plugin-kit
```

## Read a hook payload

`parseJson` returns an `Option`: `{ _tag: "Some", value }` for JSON text and `{ _tag: "None" }` otherwise, and it never throws. `isRecord` narrows a value to a plain object, so you can read its keys without a cast.

```ts
import { isRecord, parseJson } from "@r_masseater/plugin-kit";

const parsed = parseJson(text);
if (parsed._tag === "Some" && isRecord(parsed.value)) {
  console.log(parsed.value["tool_name"]);
}
```

## Find the cache folder

`cacheRootOf` returns the folder a plugin keeps downloaded or built files in: `$XDG_CACHE_HOME/<segments>`, or `~/.cache/<segments>` when `XDG_CACHE_HOME` is unset or empty. It builds the path and creates nothing. `cacheRootEffect` is the same lookup as an Effect that fails with `CacheRootError` when neither variable is set.

```ts
import { cacheRootOf } from "@r_masseater/plugin-kit";

const root = await cacheRootOf(["my-plugin", "runtime"]);
```

## Agent skills

The package ships an agent skill in `skills/`. Add `permissions: { "@r_masseater/plugin-kit": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links it into the skill directories of your agents.

## License

[MIT](LICENSE)
