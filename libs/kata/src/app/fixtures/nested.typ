#import "/.kata/kata.typ": *
#show: figure
#nested(root: (kind: "outside", icon: "cloud", body: [Cloudflare], children: (
  (kind: "system", icon: "dns", body: [Worker], children: ((kind: "data", icon: "database", body: [Durable Object]),)),
  (kind: "data", icon: "inventory_2", body: [R2]),
)))
