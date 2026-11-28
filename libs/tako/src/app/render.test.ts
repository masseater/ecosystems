import { it } from "@effect/vitest";
import { Effect, String as Str } from "effect";
import { expect } from "vite-plus/test";

import type { Format, Theme } from "#/entities/figure/index.ts";
import { failWith } from "#/shared/lib/errors.ts";
import type { RenderError } from "#/shared/lib/errors.ts";

import { renderFigure } from "./render.ts";

const PDF_HEADER = "%PDF";
const decoder = new TextDecoder();

const fixture = (name: string): string => new URL(`fixtures/${name}`, import.meta.url).pathname;

const render = (name: string, theme: Theme, format: Format): Effect.Effect<string, RenderError> =>
  Effect.tryPromise({
    try: () => renderFigure({ file: fixture(name), theme, format }),
    catch: failWith,
  }).pipe(Effect.map((bytes) => decoder.decode(bytes)));

it.effect("a flow with a hero number renders to an SVG", () =>
  Effect.gen(function* heroFlow() {
    const svg = yield* render("hero-flow.typ", "light", "svg");
    expect(svg).toContain("<svg");
  }),
);

it.effect("the same source renders in light and dark with different backgrounds", () =>
  Effect.gen(function* bothThemes() {
    const light = yield* render("bars.typ", "light", "svg");
    const dark = yield* render("bars.typ", "dark", "svg");
    expect(light).toContain(String.raw`fill="#fff"`);
    expect(dark).toContain("#14181c");
    expect(light).not.toContain("#14181c");
  }),
);

it.effect("the PDF output starts with the PDF header", () =>
  Effect.gen(function* pdfHeader() {
    const pdf = yield* render("bars.typ", "light", "pdf");
    expect(Str.startsWith(PDF_HEADER)(pdf)).toBe(true);
  }),
);

it.effect("a kind that does not exist fails with the Typst message", () =>
  Effect.gen(function* unknownKind() {
    const failure = yield* Effect.flip(render("unknown-kind.typ", "light", "svg"));
    expect(failure.message).toMatch(/stranger/v);
  }),
);

const FIGURES = ["cycle", "tree", "timeline", "nested", "fork"] as const;

for (const figure of FIGURES) {
  it.effect(`the ${figure} part renders in both themes`, () =>
    Effect.gen(function* figureRenders() {
      const light = yield* render(`${figure}.typ`, "light", "svg");
      const dark = yield* render(`${figure}.typ`, "dark", "svg");
      expect(light).toContain("<svg");
      expect(dark).toContain("#14181c");
    }),
  );
}
