# @r_masseater/tako

Draws infographics from a few lines of Typst. You write what the figure says, and the parts decide the layout, the spacing, the colors and the shapes.

It requires Node.js 26 or later.

```sh
bun add @r_masseater/tako
```

## Write a figure

```typst
#import "/.tako/tako.typ": *
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

`isotype(rows: ((label: [...], value: 30), ...), icon: "person", per: 10, unit: "...")` repeats one icon per `per` units and writes the exact value at the end of the row.
`quadrant(x-axis: (...), y-axis: (...), points: ((x: 0.2, y: 0.8, label: [...], kind: ..., hero: true), ...))` places points on two crossed axes.
`annotated(picture: ..., notes: ((side: "left", x: 0.1, y: 0.2, name: [...], note: [...]), ...))` draws leader lines from a picture to names on its sides.
`sysmap(nodes: ((id: ..., kind: ..., body: [...]), ...), links: ((from: ..., to: ..., label: [...], condition: true), ...))` lays nodes out in layers from the links and curves the arrows around nodes in between.

## Charts

The chart parts wrap [primaviz](https://typst.app/universe/package/primaviz), which Typst downloads on the first render, so import them separately.

```typst
#import "/.tako/charts.typ": *
```

- `trend(labels: (...), series: ((name: ..., values: (...)),))` draws a line.
- `stacked(labels: (...), series: (...))` stacks bars in shades of one hue and names each part inside it.
- `funnel(stages: (([name], 1000), ...))` narrows by stage.
- `sankey(nodes: ((name: ..., kind: ...), ...), flows: ((from: "a", to: "b", value: 3), ...))` draws flows between nodes by name.

## Examples

The agent skill ships `examples/`, one working source per figure type with its light and dark SVG.

## Render

```sh
tako render figure.typ
tako render figure.typ --theme dark --format pdf
```

Without `--theme`, it writes `figure.light.svg` and `figure.dark.svg` next to the source. `--format` is `svg` or `pdf`.

From code, `renderFigure` returns the bytes.

```ts
import { renderFigure } from "@r_masseater/tako";

const svg = await renderFigure({ file: "figure.typ", theme: "light", format: "svg" });
```

An SVG draws its text as outlines. Use `pdf` where the text must stay searchable. A figure with Japanese text needs a Japanese font installed, and Noto Sans CJK JP is the first choice.

## Agent skills

The package ships an agent skill in `skills/`. Add `permissions: { "@r_masseater/tako": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links it into the skill directories of your agents.

## License

[MIT](LICENSE)
