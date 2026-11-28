import { Array as Arr, Effect, Option, Result, String as Str, pipe } from "effect";
import type { Definition, Link, Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { REFERENCE_SCHEME, branchLinkReference, parseReference } from "./reference.ts";
import type { Reference } from "./reference.ts";

const RULE: RuleName = "reference-link";
const MARKDOWN = ".md";
const FIXTURE = /(?:^|\/)fixtures\//u;
const READ_CONCURRENCY = 16;

const parser = unified().use(remarkParse);

/** @internal */
export interface LinkAt {
  readonly destination: string;
  readonly index: number;
}

/** @internal */
export interface MarkdownText {
  readonly file: string;
  readonly source: string;
}

const linkAt = (node: Link | Definition): Option.Option<LinkAt> =>
  pipe(
    Option.fromNullishOr(node.position),
    Option.flatMap(({ start }) => Option.fromNullishOr(start.offset)),
    Option.map((index): LinkAt => ({ destination: node.url, index })),
  );

/** @internal */
export const linksIn = (source: string): readonly LinkAt[] => {
  const found: LinkAt[] = [];
  const tree: Root = parser.parse(source);
  visit(tree, (node) => {
    if (node.type === "link" || node.type === "definition") {
      found.push(...Option.toArray(linkAt(node)));
    }
  });
  return found;
};

/** @internal */
export const referenceMessage = (destination: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(destination, (text) => REFERENCE_SCHEME.test(text)),
    Option.flatMap((text) =>
      Result.match(parseReference(text), {
        onFailure: Option.some,
        onSuccess: () => Option.none(),
      }),
    ),
  );

/** @internal */
export const referenceOf = (destination: string): Option.Option<Reference> =>
  pipe(
    Option.liftPredicate(destination, (text) => REFERENCE_SCHEME.test(text)),
    Option.flatMap((text) => Result.getSuccess(parseReference(text))),
    Option.orElse(() => branchLinkReference(destination)),
  );

/** @internal */
export const markdownTexts = Effect.fn("markdownTexts")(function* markdownTexts(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const documents = pipe(
    listed,
    Arr.filter((file) => Str.endsWith(MARKDOWN)(file) && !FIXTURE.test(file)),
    Arr.map((file) => files.join(root, file)),
  );
  const read = yield* Effect.forEach(
    documents,
    (file) =>
      Effect.map(
        files.readFile(file),
        Option.map((source): MarkdownText => ({ file, source })),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(read);
});

const problemsIn = ({ file, source }: MarkdownText): readonly Problem[] =>
  Arr.flatMap(linksIn(source), ({ destination, index }) =>
    pipe(
      referenceMessage(destination),
      Option.map((message): Problem => ({
        file,
        ...positionOf(source)(index),
        rule: RULE,
        message,
      })),
      Option.toArray,
    ),
  );

/** @internal */
export const checkReferenceLinks = Effect.fn("checkReferenceLinks")(function* checkReferenceLinks(
  root: string,
) {
  const texts = yield* markdownTexts(root);
  return pipe(texts, Arr.flatMap(problemsIn));
});
