# @r_masseater/kata

Draws infographics from a few lines of Typst. You write what the figure says, and the parts decide the layout, the spacing, the colors and the shapes.

It requires Node.js 26 or later.

```sh
bun add @r_masseater/kata
```

## Write a figure

```typst
#import "/.kata/kata.typ": *
#show: figure

#flow(
  hero: (big: [about \$13], caption: [per day]),
  nodes: (
    (kind: "outside", icon: "forum", body: [Discord], note: [1M messages]),
    (kind: "system", icon: "smart_toy", body: [Gateway]),
    (kind: "data", icon: "database", body: [Durable Object], note: [14.8 rows each]),
  ),
)
```

`kind` is one of `person`, `system`, `data`, `amount`, `condition` and `outside`. `icon` is the name of a Material Symbols icon. The hero number hangs from the last node by default. Pass `to` with a node index to hang it from another node.

```typst
#bars(
  unit: "$",
  rows: ((label: [now], value: 13), (label: [fewer indexes], value: 9)),
  limit: (value: 0.1, label: [limit \$0.1]),
)
```

## More parts

- `cycle(nodes: (...), hero: (...))` puts the nodes on a ring with arrows between them and an optional hero number in the middle.
- `tree(root: (kind: ..., body: [...], children: (...)))` lays a tree out top down.
- `timeline(events: ((when: [...], kind: ..., body: [...], note: [...]), ...))` alternates events above and below an axis.
- `nested(root: (kind: ..., body: [...], children: (...)))` draws boxes inside boxes.
- `fork(before: (...), decide: (...), yes: (...), no: (...), yes-label: [...], no-label: [...])` splits a flow at a condition into two branches.

## Render

```sh
kata render figure.typ
kata render figure.typ --theme dark --format pdf
```

Without `--theme`, it writes `figure.light.svg` and `figure.dark.svg` next to the source. `--format` is `svg` or `pdf`.

From code, `renderFigure` returns the bytes.

```ts
import { renderFigure } from "@r_masseater/kata";

const svg = await renderFigure({ file: "figure.typ", theme: "light", format: "svg" });
```

An SVG draws its text as outlines. Use `pdf` where the text must stay searchable. A figure with Japanese text needs a Japanese font installed, and Noto Sans CJK JP is the first choice.

## Agent skills

The package ships an agent skill in `skills/`. Add `permissions: { "@r_masseater/kata": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links it into the skill directories of your agents.

## License

[MIT](LICENSE)
