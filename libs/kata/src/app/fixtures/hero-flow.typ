#import "/.kata/kata.typ": *
#show: figure
#flow(
  hero: (big: [約 \$13], caption: [1 日・500 サーバー・各 2,000 件]),
  nodes: (
    (kind: "outside", icon: "forum", body: [Discord], note: [1 日 100 万件]),
    (kind: "system", icon: "smart_toy", body: [Gateway]),
    (kind: "data", icon: "database", body: [Durable Object], note: [1 件で 14.8 行]),
    (kind: "condition", icon: "balance", body: [許容か]),
  ),
)
