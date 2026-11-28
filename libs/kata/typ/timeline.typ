#import "theme.typ": tokens, kinds
#import "node.typ": *

#let timeline(events: (), gap: 36pt) = context {
  let u = uniform(events)
  let h = u.height
  let step = calc.max(..u.widths) + gap
  let stem = 44pt
  let total = step * (events.len() - 1) + calc.max(..u.widths)
  let axis-y = h + stem + 26pt
  box(width: total, height: 2 * axis-y, {
    place(top + left, curve(stroke: 3pt + tokens.line, curve.move((0pt, axis-y)), curve.line((total, axis-y))))
    for (i, event) in events.enumerate() {
      let x = calc.max(..u.widths) / 2 + step * i
      let above = calc.rem(i, 2) == 0
      let spec = kinds.at(event.kind)
      let node-y = if above { h / 2 } else { axis-y + 26pt + stem + h / 2 }
      let stem-from = if above { h } else { axis-y + 26pt + stem }
      place(top + left, curve(stroke: 2.5pt + spec.stroke, curve.move((x, stem-from)), curve.line((x, axis-y))))
      place(top + left, dx: x - 7pt, dy: axis-y - 7pt, circle(radius: 7pt, fill: spec.stroke))
      let date-y = if above { axis-y + 12pt } else { axis-y - 36pt }
      place(top + left, dx: x - 60pt, dy: date-y, box(width: 120pt, align(center, text(size: 15pt, weight: "bold", fill: tokens.ink, event.when))))
      at-center((x, node-y), u.widths.at(i), h, build(event, h, u.widths.at(i)))
      if event.at("note", default: none) != none {
        let note-y = if above { 0pt - 24pt } else { node-y + h / 2 + 6pt }
        place(top + left, dx: x - 90pt, dy: note-y, box(width: 180pt, align(center, text(size: 14pt, fill: tokens.sub, event.note))))
      }
    }
  })
}
