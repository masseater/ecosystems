# @r_masseater/mapped-import

Import files in your own format from TypeScript. Describe how a file maps to source code, hand that to a TypeScript content mapper for editor features, and turn the file into a module with a Vite plugin.

It requires [Vite+](https://viteplus.dev/) and Node.js 26 or later. `effect` and `vite-plus` are peer dependencies.

```sh
vp add @r_masseater/mapped-import effect vite-plus
```

## Describe the mapping

A file maps to a list of segments. Text is emitted as is, and the other kinds keep a link to a span of the original file so editor features such as hover and go to definition keep working.

```ts
import { nameLiteral, renderSegments, text } from "@r_masseater/mapped-import";
import { Option } from "effect";

const content = "greeting";
const segments = [
  text("export const "),
  ...nameLiteral({ name: "greeting", span: Option.some({ start: 0, end: 8 }) }),
  text(" = 1;"),
];

renderSegments({ content, segments });
```

`nameLiteral` quotes a name. When the name needs no escaping, the original text is kept verbatim between the quotes, so the span stays linked. Otherwise an alias is emitted.

## Map for the TypeScript server

`mappedOutput` turns a result into the object that `ts-content-mapper` expects. A successful result becomes mapped code. A failed one becomes the fallback text plus one diagnostic per issue.

```ts
import { mappedOutput } from "@r_masseater/mapped-import/mapper";
```

## Import with Vite

`contentImport` builds a Vite plugin for an extension. `load` receives the file and returns the module code, an optional declaration file written next to the source, and the files to watch.

```ts
import { contentImport } from "@r_masseater/mapped-import/vite";
import { Effect, Option } from "effect";

export const plugin = contentImport({
  name: "my-format",
  extension: ".my",
  load: ({ content }) =>
    Effect.succeed({
      code: `export default ${JSON.stringify(content)};`,
      declaration: Option.some("declare const value: string;\nexport default value;\n"),
      watchFiles: [],
    }),
});
```

`declarationPathOf(".my")("a.my")` gives `a.d.my.ts`.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/mapped-import#<skill>`.

## License

[MIT](LICENSE)
