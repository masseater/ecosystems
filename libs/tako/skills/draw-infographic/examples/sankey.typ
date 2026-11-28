#import "/.tako/charts.typ": *
#import "/.tako/tako.typ": figure
#show: figure
#sankey(
  nodes: ((name: "1 件", kind: "amount"), (name: "message 表", kind: "data"), (name: "その他の表", kind: "data")),
  flows: ((from: "1 件", to: "message 表", value: 10), (from: "1 件", to: "その他の表", value: 4.8)),
)
