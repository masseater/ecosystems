import { Array as Arr, Effect, Schema, String as Str, pipe } from "effect";

export interface FoundComment {
  readonly index: number;
  readonly text: string;
}

export type Found = Effect.Effect<readonly FoundComment[], CommentsUnreadable>;

const taggedError = Schema.TaggedError;

export class CommentsUnreadable extends taggedError<
  CommentsUnreadable,
  { readonly brand: unique symbol }
>()("CommentsUnreadable", { reader: Schema.String, message: Schema.String }) {}

export const unreadable =
  (reader: string) =>
  (cause: unknown): CommentsUnreadable =>
    CommentsUnreadable.make({ reader, message: String(cause) });

const trimmed = ({ index, text }: FoundComment): FoundComment => ({
  index,
  text: Str.trimEnd(text),
});

export const commentsFrom =
  (reader: string) =>
  (read: (source: string) => readonly FoundComment[]) =>
  (source: string): Found =>
    Effect.try({
      try: () => pipe(read(source), Arr.map(trimmed)),
      catch: unreadable(reader),
    });
