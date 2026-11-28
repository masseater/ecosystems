# @r_masseater/plugin-kit

Reads untrusted JSON in Claude Code plugin hooks and scripts.

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

## License

[MIT](LICENSE)
