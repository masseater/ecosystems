#import "theme.typ": tokens, kinds

#let annotated(picture: none, notes: (), gap: 56pt, note-width: 220pt) = context {
  let m = measure(picture)
  let left-notes = notes.filter(n => n.side == "left")
  let right-notes = notes.filter(n => n.side == "right")
  let lead = if left-notes.len() == 0 { 0pt } else { note-width + gap }
  let tail = if right-notes.len() == 0 { 0pt } else { note-width + gap }
  let stroke = 2pt + tokens.sub
  box(width: lead + m.width + tail, height: m.height, {
    place(top + left, dx: lead, picture)
    for (side, group) in (("left", left-notes), ("right", right-notes)) {
      for n in group {
        let tx = lead + n.x * m.width
        let ty = n.y * m.height
        let nx = if side == "left" { lead - gap } else { lead + m.width + gap }
        place(top + left, curve(stroke: stroke, curve.move((nx, ty)), curve.quad(((nx + tx) / 2, ty), (tx, ty))))
        place(top + left, dx: tx - 5pt, dy: ty - 5pt, circle(radius: 5pt, fill: tokens.sub, stroke: none))
        let text-box = box(width: note-width, {
          align(if side == "left" { right } else { left }, text(size: 18pt, weight: "bold", fill: tokens.ink, n.name))
          if n.at("note", default: none) != none {
            align(if side == "left" { right } else { left }, text(size: 15pt, fill: tokens.sub, n.note))
          }
        })
        let size = measure(text-box)
        place(top + left, dx: if side == "left" { lead - gap - note-width - 8pt } else { nx + 8pt }, dy: ty - size.height / 2, text-box)
      }
    }
  })
}
