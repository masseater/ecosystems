#import "theme.typ": tokens, kinds
#import "shapes.typ": outer-width
#import "node.typ": *

#let flat(n) = (n,) + n.at("children", default: ()).map(flat).flatten()

#let tree(root: (), gap-x: 28pt, gap-y: 64pt) = context {
  let everyone = flat(root)
  let sized = everyone.map(natural)
  let h = calc.max(..sized.map(s => s.height))
  let own(n) = outer-width(n.kind, natural(n).inner, h)
  let span(n) = {
    let kids = n.at("children", default: ())
    if kids.len() == 0 { own(n) } else {
      calc.max(own(n), kids.map(span).sum() + gap-x * (kids.len() - 1))
    }
  }
  let lay(n, left, depth) = {
    let kids = n.at("children", default: ())
    let width = span(n)
    let cy = depth * (h + gap-y) + h / 2
    if kids.len() == 0 {
      (items: ((node: n, cx: left + width / 2, cy: cy, w: own(n)),), edges: ())
    } else {
      let block = kids.map(span).sum() + gap-x * (kids.len() - 1)
      let cursor = left + (width - block) / 2
      let items = ()
      let edges = ()
      let centers = ()
      for kid in kids {
        let sub = lay(kid, cursor, depth + 1)
        items += sub.items
        edges += sub.edges
        centers.push(sub.items.first().cx)
        cursor += span(kid) + gap-x
      }
      let cx = (centers.first() + centers.last()) / 2
      for kid-center in centers {
        edges.push((from: (cx, cy + h / 2), to: (kid-center, cy + h + gap-y - h / 2 - 0pt)))
      }
      items.insert(0, (node: n, cx: cx, cy: cy, w: own(n)))
      (items: items, edges: edges)
    }
  }
  let placed = lay(root, 0pt, 0)
  let depth = calc.max(..placed.items.map(i => i.cy)) + h / 2
  box(width: span(root), height: depth, {
    for e in placed.edges {
      let mid = (e.from.at(1) + e.to.at(1)) / 2
      place(top + left, curve(stroke: 2.5pt + tokens.sub, curve.move(e.from), curve.cubic((e.from.at(0), mid), (e.to.at(0), mid), e.to)))
    }
    for item in placed.items {
      at-center((item.cx, item.cy), item.w, h, build(item.node, h, item.w))
    }
  })
}
