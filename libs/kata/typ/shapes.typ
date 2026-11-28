#import "theme.typ": kinds, stroke-width

#let scaled(w, h, point) = (point.at(0) / 200 * w, point.at(1) / 80 * h)

#let cubic(w, h, a, b, c) = curve.cubic(scaled(w, h, a), scaled(w, h, b), scaled(w, h, c))

#let page-parts(w, h) = (
  curve.move(scaled(w, h, (0, 14))),
  cubic(w, h, (0, 6), (6, 0), (14, 0)),
  curve.line(scaled(w, h, (186, 0))),
  cubic(w, h, (194, 0), (200, 6), (200, 14)),
  curve.line(scaled(w, h, (200, 69))),
  cubic(w, h, (164, 87), (136, 60), (100, 69)),
  cubic(w, h, (64, 87), (36, 60), (0, 69)),
  curve.close(mode: "straight"),
)

#let lens-parts(w, h) = (
  curve.move(scaled(w, h, (0, 40))),
  cubic(w, h, (44, -6.4), (156, -6.4), (200, 40)),
  cubic(w, h, (156, 86.4), (44, 86.4), (0, 40)),
  curve.close(mode: "straight"),
)

#let cloud-segments = (
  ((118.6, 0), (139.5, 4.7), (155.8, 9.3)),
  ((172.2, 13.8), (192, 20.2), (198, 27.3)),
  ((203.9, 34.4), (197.4, 44.1), (191.3, 51.9)),
  ((185.2, 59.6), (176.3, 69.3), (161.1, 73.7)),
  ((145.9, 78), (120.2, 78.1), (100, 78)),
  ((79.8, 77.9), (55.3, 77.4), (40, 73)),
  ((24.8, 68.7), (15, 59.5), (8.7, 51.9)),
  ((2.4, 44.2), (-3.9, 34.4), (2, 27.3)),
  ((8, 20.2), (27.8, 13.8), (44.2, 9.3)),
  ((60.5, 4.7), (81.4, 0), (100, 0)),
)

#let cloud-parts(w, h) = (
  curve.move(scaled(w, h, (100, 0))),
  ..cloud-segments.map(s => cubic(w, h, ..s)),
  curve.close(mode: "straight"),
)

#let inner-width(kind, outer, h) = {
  if kind == "person" { outer - h * 0.55 }
  else if kind == "amount" { outer * 0.74 }
  else if kind == "condition" { outer * 0.6 }
  else if kind == "outside" { outer * 0.82 }
  else { outer - 28pt }
}

#let outer-width(kind, inner, h) = {
  if kind == "person" { inner + h * 0.55 }
  else if kind == "amount" { inner / 0.74 }
  else if kind == "condition" { inner / 0.6 }
  else if kind == "outside" { inner / 0.82 }
  else { inner + 28pt }
}

#let shape(kind, w, h) = {
  let spec = kinds.at(kind)
  let line = stroke-width + spec.stroke
  let fill = spec.fill
  if kind == "person" { rect(width: w, height: h, radius: h / 2, fill: fill, stroke: line) }
  else if kind == "system" { rect(width: w, height: h, radius: 18pt, fill: fill, stroke: line) }
  else if kind == "amount" { ellipse(width: w, height: h, fill: fill, stroke: line) }
  else if kind == "data" { box(width: w, height: h, curve(fill: fill, stroke: line, ..page-parts(w, h))) }
  else if kind == "condition" { box(width: w, height: h, curve(fill: fill, stroke: line, ..lens-parts(w, h))) }
  else {
    let dashed = (paint: spec.stroke, thickness: stroke-width, dash: (6pt, 5pt))
    box(width: w, height: h, curve(fill: fill, stroke: dashed, ..cloud-parts(w, h)))
  }
}
