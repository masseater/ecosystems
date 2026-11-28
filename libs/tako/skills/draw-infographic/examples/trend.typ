#import "/.tako/charts.typ": *
#import "/.tako/tako.typ": figure
#show: figure
#trend(
  labels: ("10", "50", "100", "250", "500"),
  series: ((name: "百万行/日", values: (0.3, 1.5, 3.0, 7.4, 14.8)),),
)
