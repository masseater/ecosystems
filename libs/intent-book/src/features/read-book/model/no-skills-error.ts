import { Schema } from "effect";

const taggedError = Schema.TaggedError;

export class NoSkillsError extends taggedError<NoSkillsError, { readonly brand: unique symbol }>()(
  "NoSkillsError",
  { directory: Schema.String },
) {}
