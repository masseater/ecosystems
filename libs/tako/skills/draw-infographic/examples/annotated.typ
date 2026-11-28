#import "/.tako/tako.typ": *
#show: figure
#let part(y, label) = place(top + left, dx: 20pt, dy: y, rect(width: 260pt, height: 56pt, radius: 28pt, fill: kinds.system.fill, stroke: 2pt + kinds.system.stroke))
#annotated(
  picture: box(width: 300pt, height: 230pt, {
    place(top + left, rect(width: 300pt, height: 230pt, radius: 32pt, fill: tokens.bg, stroke: 2pt + kinds.system.stroke))
    part(24pt, none)
    part(92pt, none)
    part(160pt, none)
  }),
  notes: (
    (side: "left", x: 0.1, y: 0.2, name: [接続], note: [Discord の Gateway を保つ]),
    (side: "left", x: 0.1, y: 0.8, name: [許可判定], note: [許可済みだけ通す]),
    (side: "right", x: 0.9, y: 0.5, name: [書き込み], note: [1 件で 14.8 行]),
  ),
)
