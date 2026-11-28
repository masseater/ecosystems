#import "theme.typ": tokens, kinds
#import "node.typ": *

#let fork(before: (), decide: (), yes: (), no: (), yes-label: [], no-label: [], gap: 56pt) = context {
  let everyone = before + (decide,) + yes + no
  let u = uniform(everyone)
  let h = u.height
  let rows-gap = h + 52pt
  let widths = u.widths
  let x-of(index-list) = {
    let xs = ()
    let x = 0pt
    for i in index-list {
      xs.push(x)
      x += widths.at(i) + gap
    }
    xs
  }
  let before-idx = range(before.len())
  let decide-idx = before.len()
  let yes-idx = range(decide-idx + 1, decide-idx + 1 + yes.len())
  let no-idx = range(decide-idx + 1 + yes.len(), everyone.len())
  let main-xs = x-of(before-idx + (decide-idx,))
  let after-x = main-xs.last() + widths.at(decide-idx) + gap
  let yes-xs = x-of(yes-idx).map(x => x + after-x)
  let no-xs = x-of(no-idx).map(x => x + after-x)
  let row-end(xs, idx) = if xs.len() == 0 { 0pt } else { xs.last() + widths.at(idx.last()) }
  let total = calc.max(row-end(main-xs, before-idx + (decide-idx,)), row-end(yes-xs, yes-idx), row-end(no-xs, no-idx))
  let place-row(indexes, xs, y) = {
    for (k, i) in indexes.enumerate() {
      place(top + left, dx: xs.at(k), dy: y, build(everyone.at(i), h, widths.at(i)))
    }
    for k in range(indexes.len() - 1) {
      link((xs.at(k) + widths.at(indexes.at(k)), y + h / 2), (xs.at(k + 1), y + h / 2), bend: 14pt)
    }
  }
  box(width: total, height: 3 * h + 2 * (rows-gap - h), {
    place-row(before-idx + (decide-idx,), main-xs, rows-gap)
    place-row(yes-idx, yes-xs, 0pt)
    place-row(no-idx, no-xs, 2 * rows-gap)
    let from = (main-xs.last() + widths.at(decide-idx) * 0.8, rows-gap + h * 0.1)
    let start = (main-xs.last() + widths.at(decide-idx) * 0.85, rows-gap + 2pt)
    let bottom = (main-xs.last() + widths.at(decide-idx) * 0.85, rows-gap + h - 2pt)
    let magenta = kinds.condition.stroke
    link(start, (yes-xs.first(), h / 2), color: magenta, dashed: true, bend: 24pt, label: yes-label)
    link(bottom, (no-xs.first(), 2 * rows-gap + h / 2), color: magenta, dashed: true, bend: -24pt, label: no-label)
  })
}
