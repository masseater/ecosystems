#import "theme.typ": tokens, kinds
#import "shapes.typ": shape, outer-width

#let icon-of(name, color, size) = image(
  bytes(read("/.kata/icons/" + name + ".svg").replace("<path ", "<path fill=\"" + color.to-hex() + "\" ")),
  format: "svg",
  width: size,
)

#let content-of(kind, icon, body) = grid(
  columns: if icon == none { 1 } else { 2 },
  column-gutter: 8pt,
  align: horizon,
  ..if icon == none { () } else { (icon-of(icon, kinds.at(kind).stroke, 22pt),) },
  text(size: 18pt, weight: "bold", fill: tokens.ink, body),
)

#let natural(node) = {
  let c = content-of(node.kind, node.at("icon", default: none), node.body)
  let m = measure(c)
  (inner: m.width, height: calc.max(m.height + 24pt, 52pt), content: c)
}

#let build(node, h, w) = box(width: w, height: h, {
  shape(node.kind, w, h)
  place(center + horizon, content-of(node.kind, node.at("icon", default: none), node.body))
})

#let uniform(nodes) = {
  let sized = nodes.map(natural)
  let h = calc.max(..sized.map(s => s.height))
  let widths = nodes.zip(sized).map(p => outer-width(p.at(0).kind, p.at(1).inner, h))
  (height: h, widths: widths)
}

#let arrow-head(tip, from, color) = {
  let angle = calc.atan2((tip.at(0) - from.at(0)) / 1pt, (tip.at(1) - from.at(1)) / 1pt)
  let size = 9pt
  let back(a) = (tip.at(0) - size * calc.cos(angle + a), tip.at(1) - size * calc.sin(angle + a))
  curve(fill: color, stroke: none, curve.move(tip), curve.line(back(25deg)), curve.line(back(-25deg)), curve.close())
}

#let link(a, b, color: tokens.sub, dashed: false, bend: 22pt, thickness: 2.5pt, label: none) = {
  let dx = (b.at(0) - a.at(0)) / 1pt
  let dy = (b.at(1) - a.at(1)) / 1pt
  let length = calc.max(calc.sqrt(dx * dx + dy * dy), 1)
  let mid = ((a.at(0) + b.at(0)) / 2 + bend * dy / length, (a.at(1) + b.at(1)) / 2 - bend * dx / length)
  let line = if dashed { (paint: color, thickness: thickness, dash: (7pt, 6pt)) } else { thickness + color }
  place(top + left, curve(stroke: line, curve.move(a), curve.quad(mid, b)))
  place(top + left, arrow-head(b, mid, color))
  if label != none {
    let at = ((a.at(0) + b.at(0)) / 4 + mid.at(0) / 2, (a.at(1) + b.at(1)) / 4 + mid.at(1) / 2)
    place(top + left, dx: at.at(0), dy: at.at(1), place(center + horizon, box(fill: tokens.bg, inset: (x: 4pt, y: 2pt), text(size: 14pt, fill: tokens.ink, label))))
  }
}

#let edge-point(center, w, h, toward) = {
  let dx = (toward.at(0) - center.at(0)) / 1pt
  let dy = (toward.at(1) - center.at(1)) / 1pt
  let tx = if calc.abs(dx) < 0.001 { 1e9 } else { (w / 2 / 1pt) / calc.abs(dx) }
  let ty = if calc.abs(dy) < 0.001 { 1e9 } else { (h / 2 / 1pt) / calc.abs(dy) }
  let t = calc.min(tx, ty)
  (center.at(0) + dx * t * 1pt, center.at(1) + dy * t * 1pt)
}

#let at-center(center, w, h, body) = place(top + left, dx: center.at(0) - w / 2, dy: center.at(1) - h / 2, body)

#let hero-box(hero) = {
  let big = text(size: 58pt, weight: "bold", fill: tokens.ink, hero.big)
  let cap = text(size: 16pt, fill: tokens.sub, hero.caption)
  let inner = stack(spacing: 12pt, align(center, big), align(center, cap))
  let m = measure(inner)
  let h = m.height / 0.55
  let w = outer-width("amount", m.width + 24pt, 0pt)
  (width: w, height: h, content: box(width: w, height: h, {
    shape("amount", w, h)
    place(center + horizon, inner)
  }))
}

