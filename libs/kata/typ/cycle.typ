#import "theme.typ": tokens, kinds
#import "node.typ": *

#let cycle(nodes: (), hero: none, label: none) = context {
  let u = uniform(nodes)
  let count = nodes.len()
  let h = u.height
  let total = u.widths.sum()
  let wmax = calc.max(..u.widths)
  let big = if hero == none { none } else { hero-box(hero) }
  let rx = calc.max(total / 3, if big == none { 0pt } else { big.width / 2 + wmax / 2 + 36pt }, 150pt)
  let ry = calc.max(rx * 0.62, if big == none { 0pt } else { big.height / 2 + h / 2 + 30pt })
  let cx = rx + wmax / 2
  let cy = ry + h / 2
  let centers = range(count).map(i => {
    let angle = -90deg + 360deg * i / count
    (cx + rx * calc.cos(angle), cy + ry * calc.sin(angle))
  })
  box(width: 2 * rx + wmax, height: 2 * ry + h, {
    for i in range(count) {
      let j = calc.rem(i + 1, count)
      let from = edge-point(centers.at(i), u.widths.at(i) + 8pt, h + 8pt, centers.at(j))
      let to = edge-point(centers.at(j), u.widths.at(j) + 14pt, h + 14pt, centers.at(i))
      link(from, to, bend: 16pt)
    }
    for (i, node) in nodes.enumerate() {
      at-center(centers.at(i), u.widths.at(i), h, build(node, h, u.widths.at(i)))
    }
    if big != none {
      at-center((cx, cy), big.width, big.height, big.content)
    }
  })
}
