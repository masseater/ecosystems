import { Option, Record as Rec, pipe } from "effect";

export const WORD = 4;
export const STRING_WORDS = 2;
const EMPTY = 0;
const LENGTH = 1;

export const aligned = (buffer: Uint8Array): Uint8Array =>
  Option.match(
    Option.liftPredicate(buffer, ({ byteOffset }) => byteOffset % WORD === EMPTY),
    {
      onNone: () => Uint8Array.from(buffer),
      onSome: (value) => value,
    },
  );

export const wordAt =
  (words: Uint32Array) =>
  (index: number): number =>
    words[index] ?? EMPTY;

export const fieldsOf =
  (header: Uint32Array) =>
  <Name extends string>(fields: Readonly<Record<Name, number>>): Readonly<Record<Name, number>> =>
    pipe(
      fields,
      Rec.map((index) => wordAt(header)(index)),
    );

export const wordsOf =
  (buffer: Uint8Array) =>
  (at: number, count: number): Uint32Array =>
    new Uint32Array(buffer.buffer, buffer.byteOffset + at * WORD, count);

export const spanText =
  (words: Uint32Array) =>
  (blob: Uint8Array, encoding: string) =>
  (spansAt: number, unit: number) =>
  (index: number): string => {
    const at = spansAt + index * STRING_WORDS;
    const offset = wordAt(words)(at) * unit;
    return new TextDecoder(encoding).decode(
      blob.subarray(offset, offset + wordAt(words)(at + LENGTH) * unit),
    );
  };
