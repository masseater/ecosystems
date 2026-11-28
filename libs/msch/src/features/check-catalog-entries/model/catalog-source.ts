import { Array as Arr, Option, String as Str, pipe } from "effect";
import { LineCounter, isMap, parseDocument, stringify } from "yaml";

const LINE_BREAK = "\n";
const SPACE = " ";
const DEFAULT_INDENT = "  ";
const CATALOG_KEY = "catalog";
const FROM_START = 0;
const COLUMN_ORIGIN = 1;

/** @internal */
export type Catalog = Readonly<Record<string, string>>;

const indented = (indent: string, added: Catalog): string =>
  pipe(
    stringify(added, { lineWidth: 0, singleQuote: false }),
    Str.split(LINE_BREAK),
    Arr.filter(Str.isNonEmpty),
    Arr.map((line) => `${indent}${line}${LINE_BREAK}`),
    Arr.join(""),
  );

const endingLine = (text: string): string => {
  if (Str.isEmpty(text) || Str.endsWith(LINE_BREAK)(text)) {
    return text;
  }
  return `${text}${LINE_BREAK}`;
};

interface Block {
  readonly indent: string;
  readonly end: number;
}

const catalogBlock = (source: string): Option.Option<Block> => {
  const lines = new LineCounter();
  return pipe(
    parseDocument(source, { lineCounter: lines }).get(CATALOG_KEY, true),
    Option.liftPredicate(isMap),
    Option.flatMap(({ range }) => Option.fromNullishOr(range)),
    Option.map(([start, end]): Block => ({
      indent: pipe(SPACE, Str.repeat(lines.linePos(start).col - COLUMN_ORIGIN)),
      end,
    })),
  );
};

/** @internal */
export const withCatalogEntries =
  (added: Catalog) =>
  (source: string): string => {
    const block = catalogBlock(source);
    if (Option.isNone(block)) {
      return `${endingLine(source)}${CATALOG_KEY}:${LINE_BREAK}${indented(DEFAULT_INDENT, added)}`;
    }
    const { indent, end } = block.value;
    const head = pipe(source, Str.slice(FROM_START, end), endingLine);
    return `${head}${indented(indent, added)}${pipe(source, Str.slice(end))}`;
  };
