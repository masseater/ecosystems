#import "theme.typ": tokens, kinds
#import "node.typ": link

#let quadrant(points: (), x-axis: (), y-axis: (), size: 420pt) = context {
  let pad = 120pt
  let plot = size
  let dot = 11pt
  box(width: plot + pad * 2, height: plot + 80pt, {
    let ox = pad
    let oy = 20pt
    place(top + left, curve(stroke: 2pt + tokens.line, curve.move((ox, oy + plot / 2)), curve.line((ox + plot, oy + plot / 2))))
    place(top + left, curve(stroke: 2pt + tokens.line, curve.move((ox + plot / 2, oy)), curve.line((ox + plot / 2, oy + plot))))
    place(top + left, dx: ox, dy: oy + plot + 12pt, box(width: plot, {
      place(left, text(size: 16pt, fill: tokens.sub, x-axis.low))
      place(right, text(size: 16pt, fill: tokens.sub, x-axis.high))
      align(center, text(size: 17pt, weight: "bold", fill: tokens.ink, x-axis.name))
    }))
    place(top + left, dx: 0pt, dy: oy, box(width: pad - 14pt, height: plot, {
      place(top + right, text(size: 16pt, fill: tokens.sub, y-axis.high))
      place(bottom + right, text(size: 16pt, fill: tokens.sub, y-axis.low))
      place(horizon + right, text(size: 17pt, weight: "bold", fill: tokens.ink, y-axis.name))
    }))
    for p in points {
      let spec = kinds.at(p.at("kind", default: "system"))
      let big = p.at("hero", default: false)
      let d = if big { dot * 1.7 } else { dot }
      let cx = ox + p.x * plot
      let cy = oy + (1 - p.y) * plot
      place(top + left, dx: cx - d / 2, dy: cy - d / 2, circle(radius: d / 2, fill: spec.fill, stroke: 2.5pt + spec.stroke))
      place(top + left, dx: cx + d / 2 + 8pt, dy: cy - 12pt, text(size: if big { 20pt } else { 17pt }, weight: if big { "bold" } else { "regular" }, fill: tokens.ink, p.label))
    }
  })
}
