import { matcher } from "@masseater.dev/path-kit";
import {
  Array as Arr,
  Effect,
  HashSet,
  Option,
  Predicate,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { COMMENT_DIRECTIVES } from "#/shared/lib/comment-directives.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { commentsWith, loadGrammars } from "./comment-readers.ts";
import type { FoundComment } from "./found-comment.ts";
import { readerOf } from "./reader-of.ts";

const RULE: RuleName = "comment";
const UNUSED_RULE: RuleName = "unused-comment-allowance";
const CONFIG_FILE = "vite.config.ts";
const VENDORED_PATHSPEC = ":(attr:linguist-vendored)";
const READ_CONCURRENCY = 64;
const START = 0;

const SHEBANG = "#!";
const PIN = /@(?:[0-9a-f]{40}|sha256:[0-9a-f]{64})\s*$/u;
const VERSION = /^\s?v?\d[\w.+-]*$/u;
const DELIMITERS = /^(?:\/\/|\/\*|<!--|<#|#|--)|(?:\*\/|-->|#>)$/gu;
const MESSAGE =
  "Comments are not written in this repository. Say it with names and types in the code, put the reason in the commit message, and delete the comment.";

const Patterns = Schema.Array(Schema.String);
const CommentSettings = Schema.Struct({ allow: Patterns });
const MschSettings = Schema.Struct({ comments: Schema.optional(CommentSettings) });
const LintSettings = Schema.Struct({ ignorePatterns: Schema.optional(Patterns) });

const RootConfig = Schema.Struct({
  msch: Schema.optional(MschSettings),
  lint: Schema.optional(LintSettings),
});

type RootConfigType = typeof RootConfig.Type;

interface RootSettings {
  readonly allow: readonly string[];
  readonly ignorePatterns: readonly string[];
}

interface Listed {
  readonly name: string;
  readonly file: string;
}

const NO_SETTINGS: RootSettings = { allow: [], ignorePatterns: [] };

const taggedError = Schema.TaggedError;

class CommentConfigUnreadable extends taggedError<
  CommentConfigUnreadable,
  { readonly brand: unique symbol }
>()("CommentConfigUnreadable", { file: Schema.String }) {}

const valueOf = (text: string): string => Str.replaceAll(DELIMITERS, "")(text);

const lineBefore = (source: string, index: number): string => {
  const lines = pipe(source, Str.slice(START, index), Str.split("\n"));
  return Option.getOrElse(Arr.last(lines), () => "");
};

const isPinVersion = (source: string, { index, text }: FoundComment): boolean =>
  PIN.test(lineBefore(source, index)) && VERSION.test(valueOf(text));

const isShebang = ({ index, text }: FoundComment): boolean =>
  index === START && Str.startsWith(SHEBANG)(text);

const isAllowed =
  (source: string, directives: RegExp) =>
  (comment: FoundComment): boolean =>
    isShebang(comment) || directives.test(valueOf(comment.text)) || isPinVersion(source, comment);

interface Scanned {
  readonly problems: readonly Problem[];
  readonly used: readonly number[];
}

const NOTHING: Scanned = { problems: [], used: [] };

const unusedMessage = (entry: string): string =>
  `allows the comment pattern \`${entry}\`, but no comment in the repository matches it. Delete the entry and add it back when a comment needs it.`;

const problemOf =
  (file: string, source: string) =>
  ({ index }: FoundComment): Problem => ({
    file,
    ...positionOf(source)(index),
    rule: RULE,
    message: MESSAGE,
  });

const settingsOf = ({ msch, lint }: RootConfigType): RootSettings => ({
  allow: pipe(
    Option.fromUndefinedOr(msch),
    Option.flatMap(({ comments }) => Option.fromUndefinedOr(comments)),
    Option.match({ onNone: () => NO_SETTINGS.allow, onSome: ({ allow }) => allow }),
  ),
  ignorePatterns: pipe(
    Option.fromUndefinedOr(lint),
    Option.flatMap(({ ignorePatterns }) => Option.fromUndefinedOr(ignorePatterns)),
    Option.getOrElse(() => NO_SETTINGS.ignorePatterns),
  ),
});

const rootSettings = Effect.fn("rootSettings")(function* rootSettings(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, CONFIG_FILE);
  const exists = yield* files.exists(file);
  if (!exists) {
    return NO_SETTINGS;
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => CommentConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(
    config,
    Option.flatMap(Schema.decodeUnknownOption(RootConfig)),
    Option.match({ onNone: () => NO_SETTINGS, onSome: settingsOf }),
  );
});

const directivePattern = (directives: readonly string[]): RegExp =>
  new RegExp(String.raw`^\s?(?:${Arr.join(directives, "|")})`, "u");

const scannedFiles = Effect.fn("scannedFiles")(function* scannedFiles(
  root: string,
  settings: RootSettings,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const generated = yield* files.generatedFiles(root);
  const vendored = yield* files.matchingFiles(root, [VENDORED_PATHSPEC]);
  const isIgnored = matcher(settings.ignorePatterns);
  const skipped = HashSet.fromIterable([
    ...generated,
    ...pipe(
      vendored,
      Arr.map((name) => files.join(root, name)),
    ),
  ]);
  return pipe(
    listed,
    Arr.filter((name) => !isIgnored(name)),
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
    Arr.filter(({ file }) => !HashSet.has(skipped, file)),
  );
});

const usedAllowances = (
  allowances: readonly RegExp[],
  found: readonly FoundComment[],
): readonly number[] =>
  pipe(
    allowances,
    Arr.map((pattern, index) => [pattern, index] as const),
    Arr.filter(([pattern]) =>
      pipe(
        found,
        Arr.some((comment) => pattern.test(valueOf(comment.text))),
      ),
    ),
    Arr.map(([, index]) => index),
  );

const entryOffset = (source: string, entry: string): number =>
  pipe(
    Str.indexOf(entry)(source),
    Option.getOrElse(() => START),
  );

const unusedAllowances = Effect.fn("unusedAllowances")(function* unusedAllowances(
  root: string,
  settings: RootSettings,
  used: HashSet.HashSet<number>,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, CONFIG_FILE);
  const text = yield* files.readFile(file);
  const source = Option.getOrElse(text, () => "");
  return pipe(
    settings.allow,
    Arr.filter((_entry, index) => !HashSet.has(used, index)),
    Arr.map((entry): Problem => ({
      file,
      ...positionOf(source)(entryOffset(source, entry)),
      rule: UNUSED_RULE,
      message: unusedMessage(entry),
    })),
  );
});

interface Scanning {
  readonly directives: RegExp;
  readonly allowances: readonly RegExp[];
  readonly comments: ReturnType<typeof commentsWith>;
}

const scanFile =
  ({ directives, allowances, comments }: Scanning) =>
  ({ name, file }: Listed, source: string): Effect.Effect<Scanned> => {
    const kept = Predicate.not(isAllowed(source, directives));
    const toProblem = problemOf(file, source);
    return Option.match(readerOf(name)(source), {
      onNone: () => Effect.succeed(NOTHING),
      onSome: (reader) =>
        comments(reader, source).pipe(
          Effect.map((found): Scanned => ({
            problems: pipe(found, Arr.filter(kept), Arr.map(toProblem)),
            used: usedAllowances(allowances, found),
          })),
          Effect.catchTag("CommentsUnreadable", ({ message }) =>
            Effect.succeed({
              problems: [
                problemInFile(RULE)(
                  file,
                  `msch could not read the comments in this file: ${message}`,
                ),
              ],
              used: [],
            }),
          ),
        ),
    });
  };

/** @internal */
export const checkComments = Effect.fn("checkComments")(function* checkComments(root: string) {
  const files = yield* RepositoryFiles;
  const settings = yield* rootSettings(root);
  const scanned = yield* scannedFiles(root, settings);
  const grammars = yield* loadGrammars();
  const scan = scanFile({
    directives: directivePattern([...COMMENT_DIRECTIVES, ...settings.allow]),
    allowances: pipe(
      settings.allow,
      Arr.map((entry) => directivePattern([entry])),
    ),
    comments: commentsWith(grammars),
  });
  const found = yield* Effect.forEach(
    scanned,
    (entry) =>
      files.readFile(entry.file).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(NOTHING),
            onSome: (source) => scan(entry, source),
          }),
        ),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  const used = HashSet.fromIterable(
    pipe(
      found,
      Arr.flatMap(({ used: indexes }) => indexes),
    ),
  );
  const unused = yield* unusedAllowances(root, settings, used);
  return [
    ...pipe(
      found,
      Arr.flatMap(({ problems }) => problems),
    ),
    ...unused,
  ];
});
