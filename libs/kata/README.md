# @r_masseater/kata

Draws infographics from a few lines of Typst. You write what the figure says, and the parts decide the layout, the spacing, the colors and the shapes. One source renders in light and dark.

It requires Node.js 26 or later.

```sh
bun add @r_masseater/kata
```

## Write a figure

```typst
#import "/.kata/kata.typ": *
#show: figure

#flow(
  hero: (big: [約 \$13], caption: [1 日・500 サーバー・各 2,000 件]),
  nodes: (
    (kind: "outside", icon: "forum", body: [Discord], note: [1 日 100 万件]),
    (kind: "system", icon: "smart_toy", body: [Gateway]),
    (kind: "data", icon: "database", body: [Durable Object], note: [1 件で 14.8 行]),
  ),
)
```

`kind` is one of `person`, `system`, `data`, `amount`, `condition` and `outside`. `icon` is the name of a Material Symbols icon. The hero number hangs from the last node by default; pass `to` with a node index to hang it from another.

```typst
#bars(
  unit: "$",
  rows: ((label: [今], value: 13), (label: [索引を減らす], value: 9)),
  limit: (value: 0.1, label: [上限 \$0.1]),
)
```

## Render

```sh
kata render figure.typ
kata render figure.typ --theme dark --format pdf
```

Without `--theme` it writes `figure.light.svg` and `figure.dark.svg` next to the source. `--format` is `svg` or `pdf`.

From code, `renderFigure({ file, theme, format })` returns the bytes.

```ts
import { renderFigure } from "@r_masseater/kata";

const svg = await renderFigure({ file: "figure.typ", theme: "light", format: "svg" });
```

The text in an SVG is drawn as outlines. Use `pdf` where the text must stay searchable.

A Japanese figure needs a Japanese font installed; Noto Sans CJK JP is the first choice.
