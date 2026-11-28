import { Schema } from "effect";

const ToolName = Schema.String.check(Schema.isPattern(/^[\w-][\w.-]*(?:\/[\w.-]+)?$/u));
const Platform = Schema.String.check(Schema.isPattern(/^(?:linux|darwin|win32)-(?:x64|arm64)$/u));
const Version = Schema.String.check(Schema.isPattern(/^\d[\w.+-]*$/u));
const BinaryName = Schema.String.check(Schema.isPattern(/^[\w][\w.-]*$/u));
const AssetFile = Schema.String.check(Schema.isPattern(/^[\w{}][\w.{}+-]*$/u));

const BinaryNames = Schema.NonEmptyArray(BinaryName);

const ToolSourceSchema = Schema.Struct({
  version: Version,
  base: Schema.optional(Schema.String),
  bin: Schema.optional(BinaryNames),
  assets: Schema.Record(Platform, AssetFile),
});

export const ToolsSectionSchema = Schema.Record(ToolName, ToolSourceSchema);

export type ToolsSection = typeof ToolsSectionSchema.Encoded;
