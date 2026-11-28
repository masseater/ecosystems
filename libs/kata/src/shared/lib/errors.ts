import { Match, Predicate, Schema } from "effect";

const taggedError = Schema.TaggedError;

export class RenderError extends taggedError<RenderError, { readonly brand: unique symbol }>()(
  "RenderError",
  { message: Schema.String },
) {}

const messageOf = (cause: unknown): string =>
  Match.value(cause).pipe(
    Match.when(Predicate.isError, (failure): string => failure.message),
    Match.orElse(String),
  );

export const failWith = (cause: unknown): RenderError =>
  RenderError.make({ message: messageOf(cause) });
