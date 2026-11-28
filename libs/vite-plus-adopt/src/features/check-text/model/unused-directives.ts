import type { TextlintKernelFilterRule, TextlintMessage, TextlintResult } from "@textlint/kernel";
import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

export type Reporter = TextlintKernelFilterRule["rule"];

type FirstParameter<Fn> = Fn extends (first: infer First, ...rest: readonly never[]) => unknown
  ? First
  : never;

type Context = FirstParameter<Reporter>;

export type Range = readonly [start: number, end: number];

const WILDCARD = "*";
const FIRST = 1;
const START = 0;

export interface Ignored {
  readonly file: string;
  readonly range: Range;
  readonly ruleId: string;
  readonly line: number;
  readonly column: number;
}

export interface Recording {
  readonly wrap: (reporter: Reporter) => Reporter;
  readonly ignored: () => readonly Ignored[];
}

export interface Unused {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

const positionOf = (text: string, index: number): Pick<Ignored, "line" | "column"> => {
  const before = pipe(text, Str.slice(START, index), Str.split("\n"));
  return {
    line: before.length,
    column:
      pipe(
        Arr.last(before),
        Option.getOrElse(() => ""),
        Str.length,
      ) + FIRST,
  };
};

const ruleIdOf = (optional: Readonly<Record<string, unknown>>): string =>
  Match.value(optional["ruleId"]).pipe(
    Match.when(Match.string, (ruleId) => ruleId),
    Match.orElse(() => WILDCARD),
  );

const delegating = (context: Context, shouldIgnore: Context["shouldIgnore"]): Context => ({
  id: context.id,
  Syntax: context.Syntax,
  severity: context.severity,
  RuleError: context.RuleError,
  locator: context.locator,
  getFilePath: () => context.getFilePath(),
  getSource: (...args) => context.getSource(...args),
  getConfigBaseDir: () => context.getConfigBaseDir(),
  shouldIgnore,
});

export const recording = (): Recording => {
  const found: Ignored[] = [];
  return {
    wrap: (reporter) => (context, options) =>
      reporter(
        delegating(context, (range, optional) => {
          const file = pipe(
            Option.fromNullishOr(context.getFilePath()),
            Option.getOrElse(() => ""),
          );
          found.push({
            file,
            range,
            ruleId: ruleIdOf(optional),
            ...positionOf(context.getSource(), range[START]),
          });
          context.shouldIgnore(range, optional);
        }),
        options,
      ),
    ignored: () => found,
  };
};

const suppresses = (ignored: Ignored, message: TextlintMessage): boolean => {
  const [start, end] = ignored.range;
  const [from, to] = message.range;
  return (
    start <= from && to <= end && (ignored.ruleId === WILDCARD || ignored.ruleId === message.ruleId)
  );
};

const unusedMessage = (ignored: Ignored): string =>
  Match.value(ignored.ruleId).pipe(
    Match.when(WILDCARD, () => "This textlint-disable comment hides no message."),
    Match.orElse((ruleId) => `This textlint-disable comment hides no message of ${ruleId}.`),
  );

export interface UnusedInput {
  readonly unfiltered: readonly TextlintResult[];
  readonly ignored: readonly Ignored[];
}

export const unusedIn = ({ unfiltered, ignored }: UnusedInput): readonly Unused[] =>
  pipe(
    ignored,
    Arr.filter(
      (entry) =>
        !pipe(
          unfiltered,
          Arr.filter((result) => result.filePath === entry.file),
          Arr.flatMap((result) => result.messages),
          Arr.some((message) => suppresses(entry, message)),
        ),
    ),
    Arr.map(({ file, line, column, ...entry }) => ({
      file,
      line,
      column,
      message: unusedMessage({ file, line, column, ...entry }),
    })),
  );

export const filesWithDirectives = (ignored: readonly Ignored[]): readonly string[] =>
  pipe(
    ignored,
    Arr.map(({ file }) => file),
    Arr.dedupe,
  );

export const formatUnused = (unused: readonly Unused[]): string =>
  pipe(
    unused,
    Arr.map(
      ({ file, line, column, message }) =>
        `${file}\n  ${String(line)}:${String(column)}  error  ${message}  unused-directive`,
    ),
    Arr.join("\n\n"),
  );
