import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf, fieldsOf } from "#/app/presets/shared/syntax/index.ts";
import type { SyntaxNode } from "#/shared/config/index.ts";

const WORD_ESCAPE = /\\(?<char>.)/gsu;
const STRING_ESCAPE = /\\(?<char>[$`"\\\n])/gu;
const QUOTE = 1;
const WRAPPERS = new Set(["busybox", "builtin", "command", "run"]);
const EXEC_OPTIONS_WITH_VALUE = new Set(["-a"]);

const literalPart = (node: SyntaxNode): Option.Option<string> => {
  switch (node.type) {
    case "word":
    case "number": {
      return Option.some(Str.replaceAll(WORD_ESCAPE, "$<char>")(node.text));
    }
    case "raw_string": {
      return Option.some(Str.slice(QUOTE, -QUOTE)(node.text));
    }
    case "string_content": {
      return Option.some(Str.replaceAll(STRING_ESCAPE, "$<char>")(node.text));
    }
    case "string":
    case "concatenation": {
      const parts = pipe(node.namedChildren, Arr.map(literalPart));
      return pipe(Option.all(parts), Option.map(Arr.join("")));
    }
    default: {
      return Option.none();
    }
  }
};

export const literalOf = (node: SyntaxNode): Option.Option<string> => {
  if (node.type === "command_name") {
    return pipe(Arr.head(node.namedChildren), Option.flatMap(literalPart));
  }
  return literalPart(node);
};

const isFlag = (text: string): boolean => Str.startsWith("-")(text);

const execTarget = (args: readonly SyntaxNode[]): Option.Option<SyntaxNode> => {
  let skip = false;
  for (const arg of args) {
    const { text } = arg;
    if (skip) {
      skip = false;
    } else if (EXEC_OPTIONS_WITH_VALUE.has(text)) {
      skip = true;
    } else if (!isFlag(text)) {
      return Option.some(arg);
    }
  }
  return Option.none();
};

const effectiveName = (name: string, args: readonly SyntaxNode[]): Option.Option<SyntaxNode> => {
  if (WRAPPERS.has(name)) {
    return pipe(
      Arr.head(args),
      Option.filter((arg) => !isFlag(arg.text)),
    );
  }
  if (name === "exec") {
    return execTarget(args);
  }
  return Option.none();
};

interface CommandTarget {
  readonly name: SyntaxNode;
  readonly text: Option.Option<string>;
  readonly wrapped: Option.Option<SyntaxNode>;
}

const targetOf = (node: SyntaxNode): Option.Option<CommandTarget> =>
  pipe(
    fieldOf("name")(node),
    Option.map((name) => {
      const text = literalOf(name);
      return {
        name,
        text,
        wrapped: pipe(
          text,
          Option.flatMap((word) => effectiveName(word, fieldsOf("argument")(node))),
        ),
      };
    }),
  );

export const effectiveWordOf = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  pipe(
    targetOf(node),
    Option.flatMap(({ name, wrapped }) =>
      Option.orElse(wrapped, () => Arr.head(name.namedChildren)),
    ),
  );

export const commandNameOf = (node: SyntaxNode): Option.Option<string> =>
  pipe(
    targetOf(node),
    Option.flatMap(({ text, wrapped }) =>
      pipe(
        text,
        Option.map((name) =>
          pipe(
            wrapped,
            Option.flatMap(literalOf),
            Option.getOrElse(() => name),
          ),
        ),
      ),
    ),
  );

export const basenameOf = (name: string): string =>
  pipe(
    Str.split("/")(name),
    Arr.last,
    Option.getOrElse(() => name),
  );
