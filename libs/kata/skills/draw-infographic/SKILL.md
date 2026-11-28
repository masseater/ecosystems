---
name: draw-infographic
description: >
  Use when an infographic, a flow with a hero number, or a bar chart with a limit line is wanted
  as a figure: write a few lines of Typst with the kata parts and kata render lays it out and
  writes light and dark SVG or PDF.
metadata:
  type: core
  library: "@r_masseater/kata"
  library_version: 0.1.0
sources:
  - typ/**
  - README.md
---

# draw-infographic

A figure drawn by hand needs coordinates and spacing chosen again for every figure. The kata parts choose the layout from the content, so the figure says what it means and nothing else.

## Setup

```sh
bun add @r_masseater/kata
```

A Japanese figure needs a Japanese font such as Noto Sans CJK JP installed.

## Write a figure

```typst
#import "/.kata/kata.typ": *
#show: figure

#flow(
  hero: (big: [about \$13], caption: [per day]),
  nodes: (
    (kind: "outside", icon: "forum", body: [Discord]),
    (kind: "system", icon: "smart_toy", body: [Gateway]),
    (kind: "data", icon: "database", body: [Durable Object], note: [14.8 rows each]),
  ),
)
```

Give each node the kind that matches what happens to it: `person` acts, `system` processes, `data` stays, `amount` is measured, `condition` splits, `outside` is not yours. The kind sets the color and the shape. `icon` is a Material Symbols name.

`bars(rows: (...), limit: (...))` draws bars in the amount color and a dashed limit line in the condition color.

## Render

```sh
bunx kata render figure.typ
```

It writes `figure.light.svg` and `figure.dark.svg`. Pass `--format pdf` where the text must stay searchable, because an SVG draws its text as outlines.
