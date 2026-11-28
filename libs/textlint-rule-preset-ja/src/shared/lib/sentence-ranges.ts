import { Array as Arr, pipe } from "effect";
import { SentenceSplitterSyntax, split } from "sentence-splitter";

export type Range = readonly [number, number];

export const sentenceRanges = (text: string): readonly Range[] =>
  pipe(
    split(text),
    Arr.filter((child) => child.type === SentenceSplitterSyntax.Sentence),
    Arr.map(({ range }): Range => range),
  );
