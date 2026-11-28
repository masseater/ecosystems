#import "/.tako/charts.typ": *
#import "/.tako/tako.typ": figure
#show: figure
#trend(labels: ("9月", "10月", "11月"), series: ((name: "コミット数", values: (120, 180, 260)),))
#stacked(labels: ("今", "索引を減らす"), series: ((name: "message", values: (10, 6)), (name: "phrase_use", values: (4, 2))))
#funnel(stages: (("訪問", 1000), ("登録", 400), ("購入", 80)))
#sankey(
  nodes: ((name: "Discord", kind: "outside"), (name: "Gateway", kind: "system"), (name: "DO", kind: "data"), (name: "R2", kind: "data")),
  flows: ((from: "Discord", to: "Gateway", value: 10), (from: "Gateway", to: "DO", value: 7), (from: "Gateway", to: "R2", value: 3)),
)
