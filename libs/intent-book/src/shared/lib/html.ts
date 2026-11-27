import { Boolean as Bool, Option, pipe } from "effect";
import type { Element } from "hast";
import { toHtml } from "hast-util-to-html";
import { h } from "hastscript";

export const optional =
  <Value>(build: (value: Value) => Element) =>
  (option: Option.Option<Value>): readonly Element[] =>
    pipe(option, Option.map(build), Option.toArray);

export const when =
  (condition: boolean) =>
  (build: () => readonly Element[]): readonly Element[] =>
    Bool.match(condition, { onTrue: build, onFalse: () => [] });

export const charset = (): Element =>
  h("meta", { httpEquiv: "content-type", content: "text/html; charset=utf-8" });

export const htmlDocument = (input: {
  readonly head: readonly Element[];
  readonly body: readonly Element[];
}): string => {
  const page = h("html", { lang: "en" }, [h("head", [...input.head]), h("body", [...input.body])]);
  return toHtml({ type: "root", children: [{ type: "doctype" }, page] });
};
