import { Schema } from "effect";

export const ThemeSchema = Schema.Literals(["light", "dark"]);

export const FormatSchema = Schema.Literals(["svg", "pdf"]);

export type Theme = typeof ThemeSchema.Type;

export type Format = typeof FormatSchema.Type;

export type Rendered = Uint8Array;

export interface RenderRequest {
  readonly file: string;
  readonly theme: Theme;
  readonly format: Format;
}
