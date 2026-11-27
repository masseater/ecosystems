import { readSong } from "@r_masseater/song-format";
import { soundingsOf } from "@r_masseater/song-format/analysis";
import { alsToFumx } from "@r_masseater/song-format/convert-als";
import { Effect, Schema, String as Str } from "effect";

import { progressionOf } from "#/app/presets/shared/lib/degrees.ts";

import type { StyleSong } from "./habits.ts";

const taggedError = Schema.TaggedError;

export class UnreadableSong extends taggedError<
  UnreadableSong,
  { readonly brand: unique symbol }
>()("UnreadableSong", { message: Schema.String }, { identifier: "UnreadableSong" }) {}

export interface SongFile {
  readonly file: string;
  readonly name: string;
  readonly bytes: Uint8Array;
}

const textOf = Effect.fn("textOf")(function* textOf({ file, name, bytes }: SongFile) {
  if (Str.endsWith(".als")(file)) {
    const fumx = yield* alsToFumx({ bytes, title: name });
    return fumx.text;
  }
  return new TextDecoder().decode(bytes);
});

export const styleSongOf = Effect.fn("styleSongOf")(function* styleSongOf(songFile: SongFile) {
  const { file, name } = songFile;
  const text = yield* textOf(songFile);
  const source = yield* readSong({ path: `${file}.fumx`, read: () => Effect.succeed(text) });
  if (source.status === "invalid") {
    return yield* UnreadableSong.make({ message: `${file} is not a song i68 can read` });
  }
  const song: StyleSong = {
    name,
    steps: progressionOf(soundingsOf(source.song))(source.song),
  };
  return song;
});
