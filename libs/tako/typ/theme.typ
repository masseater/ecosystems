#let dark = sys.inputs.at("theme", default: "light") == "dark"

#let pick(light, dark-value) = if dark { dark-value } else { light }

#let tokens = (
  bg: pick(rgb("#ffffff"), rgb("#14181c")),
  ink: pick(rgb("#1f2933"), rgb("#e8ecef")),
  sub: pick(rgb("#5b6672"), rgb("#a3adb8")),
  line: pick(rgb("#c7d0d9"), rgb("#3a444e")),
)

#let kinds = (
  person: (
    stroke: pick(rgb("#2151af"), rgb("#3769ca")),
    fill: pick(rgb("#d9e1f1"), rgb("#1d2e4b")),
  ),
  system: (
    stroke: pick(rgb("#966cd7"), rgb("#ae84f2")),
    fill: pick(rgb("#ede6f8"), rgb("#3e3556")),
  ),
  data: (
    stroke: pick(rgb("#179a8e"), rgb("#2da79b")),
    fill: pick(rgb("#d8eeec"), rgb("#1b3f3e")),
  ),
  amount: (
    stroke: pick(rgb("#d16022"), rgb("#ed7940")),
    fill: pick(rgb("#f7e4d9"), rgb("#4f3226")),
  ),
  condition: (
    stroke: pick(rgb("#942464"), rgb("#af3e7c")),
    fill: pick(rgb("#eddae5"), rgb("#3e2236")),
  ),
  outside: (
    stroke: pick(rgb("#6b7785"), rgb("#8d99a6")),
    fill: pick(rgb("#f2f3f5"), rgb("#24292f")),
  ),
)

#let stroke-width = 2pt
