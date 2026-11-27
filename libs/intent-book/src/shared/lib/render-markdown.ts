import rehypeShiki from "@shikijs/rehype";
import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  pipe,
  Record as Rec,
  Schema,
  String as Str,
} from "effect";
import type { Element, Root, RootContent } from "hast";
import { toString as textOf } from "mdast-util-to-string";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const SECOND_DEPTH = 2;
const THIRD_DEPTH = 3;
const ONE_NODE = 1;

export interface Heading {
  readonly depth: typeof SECOND_DEPTH | typeof THIRD_DEPTH;
  readonly id: string;
  readonly text: string;
}

export interface RenderedMarkdown {
  readonly tree: Root;
  readonly title: Option.Option<string>;
  readonly headings: readonly Heading[];
}

export type LinkResolver = (href: string) => Option.Option<string>;

const taggedError = Schema.TaggedError;

export class MarkdownRenderError extends taggedError<
  MarkdownRenderError,
  { readonly brand: unique symbol }
>()("MarkdownRenderError", { reason: Schema.String }) {}

const SEVERITY = /^(?<word>CRITICAL|HIGH|MEDIUM|LOW)\b/u;
const SCHEME = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu;
const SECOND_LEVEL = "h2";
const THIRD_LEVEL = "h3";
const TITLE_LEVEL = "h1";
const ANCHOR = "a";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeShiki, {
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    fallbackLanguage: "text",
    lazy: true,
    langs: [],
  });

const elementsOf = (tree: Root, tagName: string): readonly Element[] => {
  const found: Element[] = [];
  visit(tree, "element", (node: Element) => {
    if (node.tagName === tagName) {
      found.push(node);
    }
  });
  return found;
};

const severityOf = (node: Element): Option.Option<string> =>
  pipe(
    textOf(node),
    Str.match(SEVERITY),
    Option.flatMapNullishOr((found) => found.groups),
    Option.flatMap((groups) => Rec.get(groups, "word")),
    Option.map(Str.toLowerCase),
  );

const stringProperty = (node: Element, key: string): Option.Option<string> =>
  pipe(Option.fromNullishOr(node.properties[key]), Option.filter(Predicate.isString));

const markSeverity = (tree: Root): void => {
  for (const node of elementsOf(tree, THIRD_LEVEL)) {
    for (const severity of Option.toArray(severityOf(node))) {
      node.properties = { ...node.properties, dataSeverity: severity };
    }
  }
};

const resolvedHref = (node: Element, resolveLink: LinkResolver): Option.Option<string> =>
  pipe(
    stringProperty(node, "href"),
    Option.filter((href) => !SCHEME.test(href)),
    Option.flatMap(resolveLink),
  );

const rewriteLinks = (tree: Root, resolveLink: LinkResolver): void => {
  for (const node of elementsOf(tree, ANCHOR)) {
    for (const target of Option.toArray(resolvedHref(node, resolveLink))) {
      node.properties = { ...node.properties, href: target };
    }
  }
};

const isTitle = (node: RootContent): boolean =>
  node.type === "element" && node.tagName === TITLE_LEVEL;

const takeTitle = (tree: Root): Option.Option<string> =>
  pipe(
    tree.children,
    Arr.findFirstIndex(isTitle),
    Option.map((position) => {
      const [removed] = tree.children.splice(position, ONE_NODE);
      return textOf(removed);
    }),
  );

const headingOf = (node: Element, depth: Heading["depth"]): Option.Option<Heading> =>
  pipe(
    stringProperty(node, "id"),
    Option.map((id) => ({ depth, id, text: textOf(node) })),
  );

const headingsOf = (tree: Root): readonly Heading[] => {
  const found: Heading[] = [];
  visit(tree, "element", (node: Element) => {
    if (node.tagName === SECOND_LEVEL) {
      found.push(...Option.toArray(headingOf(node, SECOND_DEPTH)));
    }
    if (node.tagName === THIRD_LEVEL) {
      found.push(...Option.toArray(headingOf(node, THIRD_DEPTH)));
    }
  });
  return found;
};

export const renderMarkdown = Effect.fn("renderMarkdown")(function* renderMarkdown(
  input: Readonly<{ body: string; resolveLink: LinkResolver }>,
) {
  const tree = yield* Effect.tryPromise({
    try: () => processor.run(processor.parse(input.body), input.body),
    catch: (cause) => MarkdownRenderError.make({ reason: globalThis.String(cause) }),
  });
  const title = takeTitle(tree);
  markSeverity(tree);
  rewriteLinks(tree, input.resolveLink);
  const page: RenderedMarkdown = { tree, title, headings: headingsOf(tree) };
  return page;
});
