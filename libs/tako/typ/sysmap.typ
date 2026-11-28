#import "theme.typ": tokens, kinds
#import "shapes.typ": shape, outer-width
#import "node.typ": *

#let layers-of(nodes, links) = {
  let layer = (:)
  for n in nodes {
    layer.insert(n.id, 0)
  }
  for _ in nodes {
    for l in links {
      let next = layer.at(l.from) + 1
      if next > layer.at(l.to) and next < nodes.len() {
        layer.insert(l.to, next)
      }
    }
  }
  layer
}

#let sysmap(nodes: (), links: (), gap-x: 110pt, gap-y: 40pt) = context {
  let layer = layers-of(nodes, links)
  let by-id = (:)
  for n in nodes {
    by-id.insert(n.id, n)
  }
  let sized = uniform(nodes)
  let h = sized.height
  let width-of = (:)
  for (i, n) in nodes.enumerate() {
    width-of.insert(n.id, sized.widths.at(i))
  }
  let depth = calc.max(..layer.values()) + 1
  let center = (:)
  let col-widths = ()
  let x = 0pt
  let tallest = 0pt
  let rows-of = range(depth).map(d => nodes.filter(n => layer.at(n.id) == d))
  for rows in rows-of {
    tallest = calc.max(tallest, rows.len() * (h + gap-y) - gap-y)
  }
  for (d, members) in rows-of.enumerate() {
    let ranked = members.enumerate().map(((i, n)) => {
      let heads = links.filter(l => l.to == n.id and center.keys().contains(l.from)).map(l => center.at(l.from).at(1))
      let key = if heads.len() == 0 { i * 1pt } else { heads.sum() / heads.len() }
      (key: key, node: n)
    }).sorted(key: r => r.key / 1pt).map(r => r.node)
    let w = calc.max(..ranked.map(n => width-of.at(n.id)))
    let column = ranked.len() * (h + gap-y) - gap-y
    let top = (tallest - column) / 2
    for (i, n) in ranked.enumerate() {
      center.insert(n.id, (x + w / 2, top + i * (h + gap-y) + h / 2))
    }
    x += w + gap-x
  }
  let total = x - gap-x
  box(width: total, height: tallest, {
    for n in nodes {
      let c = center.at(n.id)
      at-center(c, width-of.at(n.id), h, build(n, h, width-of.at(n.id)))
    }
    for l in links {
      let a = center.at(l.from)
      let b = center.at(l.to)
      let from-box = (width-of.at(l.from), h)
      let to-box = (width-of.at(l.to), h)
      let start = edge-point(a, ..from-box, b)
      let end = edge-point(b, ..to-box, a)
      let dx = (end.at(0) - start.at(0)) / 1pt
      let dy = (end.at(1) - start.at(1)) / 1pt
      let length = calc.sqrt(dx * dx + dy * dy)
      let middle = ((a.at(1) + b.at(1)) / 2)
      let between = nodes.filter(n => layer.at(n.id) > calc.min(layer.at(l.from), layer.at(l.to)) and layer.at(n.id) < calc.max(layer.at(l.from), layer.at(l.to)))
      let blocked = between.filter(n => calc.abs((center.at(n.id).at(1) - middle) / 1pt) < h / 1pt)
      let bend = if blocked.len() == 0 { calc.min(length * 0.14, 30) * 1pt } else {
        let below = blocked.map(n => center.at(n.id).at(1)).sum() / blocked.len() > middle
        let sign = if (b.at(0) > a.at(0)) == below { 1 } else { -1 }
        sign * h * 1.5
      }
      let conditional = l.at("condition", default: false)
      link(
        start,
        end,
        color: if conditional { kinds.condition.stroke } else { tokens.sub },
        dashed: conditional,
        bend: bend,
        label: l.at("label", default: none),
      )
    }
  })
}
