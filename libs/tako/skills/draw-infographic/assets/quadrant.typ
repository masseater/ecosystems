#import "/.tako/tako.typ": *
#show: figure
#quadrant(
  x-axis: (name: [手間], low: [小さい], high: [大きい]),
  y-axis: (name: [効果], low: [小さい], high: [大きい]),
  points: (
    (x: 0.2, y: 0.8, label: [索引を減らす], kind: "amount", hero: true),
    (x: 0.75, y: 0.7, label: [R2 に移す], kind: "data"),
    (x: 0.3, y: 0.25, label: [何もしない], kind: "outside"),
  ),
)
