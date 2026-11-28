import { Result, pipe } from "effect";
import type { Option } from "effect";

import type { TokenKind } from "#/app/presets/entities/expression/model/ast.ts";

import { advance, isAlnum, isChar, peek, textOf } from "./cursor.ts";
import type { Cursor, Scan } from "./cursor.ts";
import { PUNCT, digitsFrom, finished, hexDigitsFrom, optionally, unexpected } from "./lexed.ts";
import type { Lexed } from "./lexed.ts";

interface Num {
  readonly at: Cursor;
  readonly float: boolean;
}

type Digits = (at: Cursor) => Result.Result<Cursor, Lexed>;

interface FloatPart {
  readonly starts: (char: Option.Option<string>) => boolean;
  readonly digits: (scan: Scan) => Digits;
}

const floatPart =
  ({ starts, digits }: FloatPart) =>
  (scan: Scan) =>
  (num: Num): Result.Result<Num, Lexed> => {
    if (!starts(peek(scan.src)(num.at))) {
      return Result.succeed(num);
    }
    return pipe(
      advance(scan.src)(num.at),
      digits(scan),
      Result.map((at): Num => ({ at, float: true })),
    );
  };

const zeroOr =
  (scan: Scan, digits: Digits): Digits =>
  (at) => {
    if (isChar("0")(peek(scan.src)(at))) {
      return Result.succeed(advance(scan.src)(at));
    }
    return digits(at);
  };

const exponentDigits =
  (scan: Scan): Digits =>
  (signed) => {
    const digits = digitsFrom("exponent part of float number")(scan);
    return zeroOr(scan, digits)(optionally("-")(scan)(signed));
  };

const fraction = floatPart({
  starts: isChar("."),
  digits: digitsFrom("fraction part of float number"),
});

const exponent = floatPart({
  starts: (char) => isChar("e")(char) || isChar("E")(char),
  digits: exponentDigits,
});

const trailing =
  (scan: Scan, what: string) =>
  (at: Cursor): Result.Result<Cursor, Lexed> => {
    if (isAlnum(peek(scan.src)(at))) {
      return Result.fail(
        unexpected(scan)({
          at,
          place: `character following ${what} ${textOf(scan)(at)}`,
          expected: PUNCT,
        }),
      );
    }
    return Result.succeed(at);
  };

const hexDigits = hexDigitsFrom("hex integer");

const lexHex = (scan: Scan, from: Cursor): Lexed => {
  const digits = pipe(
    zeroOr(scan, hexDigits(scan))(from),
    Result.flatMap(trailing(scan, "hex integer")),
  );
  return Result.match(digits, {
    onFailure: (lexed) => lexed,
    onSuccess: (end) => finished(scan)("INTEGER", end),
  });
};

const integerOf = (scan: Scan, at: Cursor): Result.Result<Num, Lexed> => {
  const digits = digitsFrom("integer part of number")(scan);
  return pipe(
    zeroOr(scan, digits)(at),
    Result.map((end): Num => ({ at: end, float: false })),
  );
};

const kindOf = (num: Num): TokenKind => {
  if (num.float) {
    return "FLOAT";
  }
  return "INTEGER";
};

const lexDecimal = (scan: Scan, at: Cursor): Lexed => {
  const number = pipe(
    integerOf(scan, at),
    Result.flatMap(fraction(scan)),
    Result.flatMap(exponent(scan)),
    Result.flatMap((num) =>
      pipe(
        trailing(scan, "number")(num.at),
        Result.map((end): Num => ({ at: end, float: num.float })),
      ),
    ),
  );
  return Result.match(number, {
    onFailure: (lexed) => lexed,
    onSuccess: (num) => finished(scan)(kindOf(num), num.at),
  });
};

export const lexNum = (scan: Scan): Lexed => {
  const at = optionally("-")(scan)(scan.start);
  const next = advance(scan.src)(at);
  if (isChar("0")(peek(scan.src)(at)) && isChar("x")(peek(scan.src)(next))) {
    return lexHex(scan, advance(scan.src)(next));
  }
  return lexDecimal(scan, at);
};
