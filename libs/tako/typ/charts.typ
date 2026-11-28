#import "@preview/primaviz:0.12.1" as viz
#import "theme.typ": tokens, kinds

#let base-theme = (
  text-color: tokens.ink,
  text-color-light: tokens.sub,
  text-color-inverse: tokens.bg,
  background: tokens.bg,
  axis-stroke: 1pt + tokens.line,
  grid-stroke: 1pt + tokens.line,
  marker-stroke: 2pt + tokens.bg,
  base-size: 15pt,
  base-gap: 10pt,
)

#let with-palette(colors) = (..base-theme, palette: colors)

#let shades(color, count) = range(count).map(i => color.lighten(i * 55% / calc.max(count - 1, 1)))

#let trend(labels: (), series: (), kind: "amount", width: 520pt, height: 280pt) = {
  let stroke = kinds.at(kind).stroke
  let colors = if series.len() == 1 { (stroke,) } else { (stroke, kinds.system.stroke, kinds.data.stroke, kinds.person.stroke) }
  let theme = with-palette(colors)
  if series.len() == 1 {
    viz.line-chart((labels: labels, values: series.at(0).values), width: width, height: height, theme: theme, show-values: true)
  } else {
    viz.multi-line-chart((labels: labels, series: series), width: width, height: height, theme: theme)
  }
}

#let stacked(labels: (), series: (), kind: "amount", width: 520pt, height: 300pt) = {
  let colors = shades(kinds.at(kind).stroke, series.len())
  let notes = series.enumerate().map(((i, s)) => {
    let below = series.slice(0, i).map(p => p.values.at(0)).sum(default: 0)
    (type: "content", x: 0, y: below + s.values.at(0) / 2, body: text(size: 14pt, fill: tokens.bg, weight: "bold", s.name), anchor: "center")
  })
  viz.stacked-bar-chart(
    (labels: labels, series: series),
    width: width,
    height: height,
    show-legend: false,
    annotations: notes,
    theme: with-palette(colors),
  )
}

#let funnel(stages: (), kind: "amount", width: 520pt, height: 300pt) = viz.funnel-chart(
  stages,
  width: width,
  height: height,
  theme: with-palette((kinds.at(kind).stroke,)),
)

#let sankey(nodes: (), flows: (), width: 560pt, height: 320pt) = {
  let names = nodes.map(n => if type(n) == str { n } else { n.name })
  let colors = nodes.map(n => if type(n) == str { kinds.system.stroke } else { kinds.at(n.at("kind", default: "system")).stroke })
  let at = name => names.position(n => n == name)
  viz.sankey-chart(
    (nodes: names, flows: flows.map(f => (from: at(f.from), to: at(f.to), value: f.value))),
    width: width,
    height: height,
    show-values: true,
    theme: with-palette(colors),
  )
}
