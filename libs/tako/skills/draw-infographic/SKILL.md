---
name: draw-infographic
description: >
  Use when an infographic is wanted as a figure: a flow with a hero number, a fork, a cycle, a tree,
  nested boxes, a timeline, a system map, bars, a line, stacked bars, a funnel, a sankey, an isotype row,
  a two-axis map or an annotated picture. Write a few lines of Typst with the tako parts and tako render
  lays it out and writes light and dark SVG or PDF.
---

# draw-infographic

A figure drawn by hand needs coordinates and spacing chosen again for every figure. The tako parts choose the layout from the content, so the figure says what it means and nothing else.

## Setup

```sh
bun add @r_masseater/tako
```

A Japanese figure needs a Japanese font such as Noto Sans CJK JP installed.

## Write a figure

```typst
#import "/.tako/tako.typ": *
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

Pick the part by what the figure shows: `flow` for steps, `fork` for a split at a condition, `cycle` for a repeat, `tree` for parent and child, `nested` for inside and outside, `timeline` for dates, `sysmap` for who hands what to whom, `bars` for a size against a limit, `isotype` for a count, `quadrant` for a position on two axes, `annotated` for the parts of a picture. The README lists their arguments.

The chart parts `trend`, `stacked`, `funnel` and `sankey` come from `#import "/.tako/charts.typ": *`. Typst downloads primaviz for them on the first render, so import that file only for a figure that needs a chart.

## Examples

`assets/` holds one working source per figure type, with its light and dark SVG next to it. Copy the one that matches the figure and change its content.

| Figure                   | Example            |
| ------------------------ | ------------------ |
| Steps with a hero number | `flow`             |
| A split at a condition   | `fork`             |
| A repeat                 | `cycle`            |
| Stages that narrow       | `funnel` (charts)  |
| Dates                    | `timeline`         |
| Who hands what to whom   | `sysmap`           |
| Parent and child         | `tree`             |
| Inside and outside       | `nested`           |
| A position on two axes   | `quadrant`         |
| The parts of a picture   | `annotated`        |
| A change over time       | `trend` (charts)   |
| A size against others    | `bars`             |
| A size against a limit   | `threshold`        |
| What a total is made of  | `stacked` (charts) |
| Where a quantity goes    | `sankey` (charts)  |
| A count                  | `isotype`          |

## Render

```sh
bunx tako render figure.typ
```

It writes `figure.light.svg` and `figure.dark.svg`. Pass `--format pdf` where the text must stay searchable, because an SVG draws its text as outlines.
