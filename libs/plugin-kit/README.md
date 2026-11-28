# @r_masseater/plugin-kit

Reads untrusted JSON in Claude Code plugin hooks and scripts.

It requires Node.js 26 or later and has no dependencies.

```sh
bun add @r_masseater/plugin-kit
```

## Read a hook payload

`parseJson` returns `undefined` instead of throwing when the text is not JSON. `isRecord` narrows a value to a plain object, so you can read its keys without a cast.

```ts
import { isRecord, parseJson } from "@r_masseater/plugin-kit";

const payload = parseJson(text);
if (isRecord(payload)) {
  console.log(payload["tool_name"]);
}
```

## License

[MIT](LICENSE)
