#import "theme.typ": tokens, kinds
#import "node.typ": icon-of

#let isotype(rows: (), icon: "person", kind: "amount", per: 1, group: 5, unit: "", size: 30pt) = context {
  let color = kinds.at(kind).stroke
  let labels = rows.map(r => measure(text(size: 17pt, r.label)).width)
  let label-width = calc.max(..labels) + 16pt
  let row-height = size + 22pt
  let count-of = r => int(calc.round(r.value / per))
  let widest = calc.max(..rows.map(count-of))
  let pitch = size + 6pt
  let groups = calc.ceil(widest / group)
  let span = widest * pitch + (groups - 1) * 14pt
  box(width: label-width + span + 110pt, height: row-height * rows.len(), {
    for (i, r) in rows.enumerate() {
      let y = row-height * i
      place(top + left, dy: y + size / 2 - 12pt, box(width: label-width - 12pt, align(right, text(size: 17pt, fill: tokens.ink, r.label))))
      let n = count-of(r)
      for k in range(n) {
        let gap = calc.quo(k, group) * 14pt
        place(top + left, dx: label-width + k * pitch + gap, dy: y, icon-of(icon, color, size))
      }
      let end = label-width + n * pitch + calc.quo(calc.max(n - 1, 0), group) * 14pt
      place(top + left, dx: end + 10pt, dy: y + size / 2 - 14pt, text(size: 20pt, weight: "bold", fill: tokens.ink, str(r.value) + unit))
    }
  })
}
