#import "/.tako/charts.typ": *
#import "/.tako/tako.typ": figure
#show: figure
#stacked(
  labels: ("1 件あたり",),
  series: ((name: "message", values: (10,)), (name: "その他", values: (4.8,))),
)
