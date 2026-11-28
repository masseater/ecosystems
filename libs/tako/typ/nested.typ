#import "theme.typ": tokens, kinds
#import "shapes.typ": outer-width
#import "node.typ": *

#let nested-part(spec, depth) = {
  let kids = spec.at("children", default: ())
  if kids.len() == 0 {
    let sized = natural(spec)
    build(spec, sized.height, outer-width(spec.kind, sized.inner, sized.height))
  } else {
    let tone = kinds.at(spec.kind)
    let fill = if depth == 0 { tone.fill } else { tokens.bg }
    let title = content-of(spec.kind, spec.at("icon", default: none), spec.body)
    box(inset: 16pt, radius: 22pt, fill: fill, stroke: if spec.kind == "outside" { (paint: tone.stroke, thickness: 2pt, dash: (6pt, 5pt)) } else { 2pt + tone.stroke }, stack(
      dir: ttb,
      spacing: 14pt,
      align(left, title),
      grid(columns: kids.len(), column-gutter: 14pt, row-gutter: 14pt, align: horizon, ..kids.map(kid => nested-part(kid, depth + 1))),
    ))
  }
}

#let nested(root: ()) = context { nested-part(root, 0) }
