#import "/.tako/tako.typ": *
#show: figure
#sysmap(
  nodes: (
    (id: "user", kind: "person", icon: "person", body: [メンバー]),
    (id: "discord", kind: "outside", icon: "forum", body: [Discord]),
    (id: "gw", kind: "system", icon: "smart_toy", body: [Gateway]),
    (id: "worker", kind: "system", icon: "dns", body: [Worker]),
    (id: "do", kind: "data", icon: "database", body: [Durable Object]),
    (id: "r2", kind: "data", icon: "database", body: [R2]),
  ),
  links: (
    (from: "user", to: "discord"),
    (from: "discord", to: "gw", label: [メッセージ]),
    (from: "gw", to: "do", label: [書き込み]),
    (from: "worker", to: "do", label: [読み取り]),
    (from: "do", to: "r2", label: [本文], condition: true),
    (from: "user", to: "worker"),
  ),
)
