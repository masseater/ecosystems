import type { TxtNode } from "@textlint/ast-node-types";
import type { TextlintRuleModule } from "@textlint/types";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { sentenceRanges } from "#/shared/lib/index.ts";
import type { Range } from "#/shared/lib/index.ts";

const EXTENSIONS =
  "md|mdx|ts|tsx|js|jsx|mjs|cjs|json|jsonc|yaml|yml|toml|rs|css|html|txt|sh|typ|cs|lock|sql|svg|xml|csv|ini|env";
const FILE_NAME = `[\\w@.~/-]*[\\w-]\\.(?:${EXTENSIONS})(?![\\w-])`;
const LINK_REF = `\\[[^\\]]*\\]\\((?![a-z][a-z0-9+.-]*:)[^)\\s#]*\\.(?:${EXTENSIONS})(?:#[^)\\s]*)?(?:\\s[^)]*)?\\)`;
const CODE_REF = `\`${FILE_NAME}\``;
const BARE_REF = `(?<![\\w/.~-])${FILE_NAME}`;
const REF = `(?:${LINK_REF}|${CODE_REF}|${BARE_REF})`;
const LOCATED = /\s*にあ(?:る|ります)$/u;
const LOCATED_AT_REF = new RegExp(`${REF}${LOCATED.source}`, "iu");
const REF_CHAIN = new RegExp(`(?:${REF}\\s*[、と]\\s*)+$`, "iu");
const ANY_REF_TEST = new RegExp(REF, "iu");
const TRAILING_SYMBOLS = /[\s。．.！!？?」』）)】]+$/u;
const CODE_SPAN = /`[^`]*`/gu;
const LINK_DESTINATION = /\]\([^)]*\)/gu;
const TOPIC = /は/u;
const CLAUSE_BREAK = /、/u;
const NO_OFFSET = 0;
const MESSAGE =
  "内容の置き場所を「〜は〜にある」と書くのは不自然な日本語です。「〜は [ファイル] に書いてある」「〜は [ファイル] を読む」のように、動詞で書き直してください。";

const hasTopic = (head: string): boolean =>
  pipe(head, Str.replaceAll(LINK_DESTINATION, "]"), Str.replaceAll(CODE_SPAN, ""), (rest) =>
    TOPIC.test(rest),
  );

const lastClause = (head: string): string =>
  pipe(
    Str.split(Str.replace(REF_CHAIN, "")(head), CLAUSE_BREAK),
    Arr.filter((clause) => Str.isNonEmpty(Str.trim(clause))),
    Arr.last,
    Option.getOrElse(() => head),
  );

const isLocatedAtFile = (sentence: string): boolean => {
  const trimmed = Str.replace(TRAILING_SYMBOLS, "")(sentence);
  const found = LOCATED_AT_REF.exec(trimmed);
  if (found === null) {
    return false;
  }
  const clause = lastClause(Str.slice(NO_OFFSET, found.index)(trimmed));
  return hasTopic(clause) && !ANY_REF_TEST.test(clause);
};

const violations = (text: string): readonly Range[] =>
  Arr.filter(sentenceRanges(text), (range) => isLocatedAtFile(Str.slice(...range)(text)));

export const noNiAruFile: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report, getSource, locator } = context;
  return {
    [Syntax.Paragraph]: (node: TxtNode): void => {
      const text = getSource(node);
      for (const [start, end] of violations(text)) {
        report(node, new RuleError(MESSAGE, { padding: locator.range([start, end]) }));
      }
    },
  };
};
