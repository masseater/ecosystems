#import "/.kata/kata.typ": *
#show: figure
#fork(
  before: ((kind: "outside", icon: "forum", body: [Discord]), (kind: "system", icon: "smart_toy", body: [Gateway])),
  decide: (kind: "condition", icon: "rule", body: [許可済み]),
  yes: ((kind: "data", icon: "database", body: [保存]),),
  no: ((kind: "system", icon: "block", body: [破棄]),),
  yes-label: [はい], no-label: [いいえ],
)
