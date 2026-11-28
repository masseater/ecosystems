#import "theme.typ": tokens, kinds
#import "shapes.typ": shape, outer-width
#import "node.typ": *

#let flow(nodes: (), gap: 64pt, hero: none) = context {
  let sized = nodes.map(natural)
  let h = calc.max(..sized.map(s => s.height))
  let widths = nodes.zip(sized).map(p => outer-width(p.at(0).kind, p.at(1).inner, h))
  let xs = ()
  let x = 0pt
  for w in widths {
    xs.push(x)
    x += w + gap
  }
  let total = x - gap
  let big = if hero == none { none } else { hero-box(hero) }
  let target = if hero == none { 0 } else { hero.at("to", default: nodes.len() - 1) }
  let cx = xs.at(target) + widths.at(target) / 2
  let lead = if big == none { 0pt } else { calc.max(0pt, big.width / 2 - cx) }
  let span = if big == none { total } else { calc.max(total, cx + big.width / 2) } + lead
  let rise = if big == none { 0pt } else { big.height + 56pt }
  box(width: span, height: rise + h + 40pt, {
    for (i, n) in nodes.enumerate() {
      place(top + left, dx: lead + xs.at(i), dy: rise, build(n, h, widths.at(i)))
      if n.at("note", default: none) != none {
        place(top + left, dx: lead + xs.at(i), dy: rise + h + 8pt, box(width: widths.at(i), align(center, text(size: 15pt, fill: tokens.sub, n.note))))
      }
    }
    for i in range(nodes.len() - 1) {
      link((lead + xs.at(i) + widths.at(i), rise + h / 2), (lead + xs.at(i + 1), rise + h / 2))
    }
    if big != none {
      place(top + left, dx: lead + cx - big.width / 2, dy: 0pt, big.content)
      link((lead + cx, big.height), (lead + cx, rise), color: kinds.condition.stroke, dashed: true, bend: -26pt)
    }
  })
}

#let figure(body) = {
  set page(width: auto, height: auto, margin: 24pt, fill: tokens.bg)
  set text(font: ("Noto Sans CJK JP", "Noto Sans JP", "Hiragino Sans"), fill: tokens.ink)
  body
}

#let bars(rows: (), limit: none, unit: "", max: auto, width: 520pt) = context {
  let scale = if max == auto { calc.max(..rows.map(r => r.value), if limit == none { 0 } else { limit.value }) } else { max }
  let labels = rows.map(r => measure(text(size: 17pt, r.label)).width)
  let label-width = calc.max(..labels) + 16pt
  let row-height = 52pt
  let spec = kinds.amount
  box(width: label-width + width + 110pt, height: row-height * rows.len() + 40pt, {
    for (i, r) in rows.enumerate() {
      let y = 32pt + row-height * i
      place(top + left, dy: y - 12pt, box(width: label-width - 12pt, align(right, text(size: 17pt, fill: tokens.ink, r.label))))
      let w = calc.max(r.value / scale * width, 10pt)
      place(top + left, dx: label-width, dy: y - 16pt, rect(width: w, height: 32pt, radius: (right: 16pt, left: 4pt), fill: spec.fill, stroke: 2pt + spec.stroke))
      place(top + left, dx: label-width + w + 10pt, dy: y - 13pt, text(size: 20pt, weight: "bold", fill: tokens.ink, unit + str(r.value)))
    }
    if limit != none {
      let x = label-width + limit.value / scale * width
      place(top + left, curve(stroke: (paint: kinds.condition.stroke, thickness: 2.5pt, dash: (7pt, 6pt)), curve.move((x, 16pt)), curve.line((x, 40pt + row-height * rows.len() - 20pt))))
      place(top + left, dx: x + 8pt, dy: 0pt, text(size: 16pt, fill: tokens.ink, limit.label))
    }
  })
}

#import "cycle.typ": cycle
#import "tree.typ": tree
#import "timeline.typ": timeline
#import "nested.typ": nested
#import "fork.typ": fork
#import "sysmap.typ": sysmap
#import "isotype.typ": isotype
#import "quadrant.typ": quadrant
#import "annotated.typ": annotated
