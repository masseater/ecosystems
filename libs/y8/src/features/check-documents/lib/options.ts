import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { RuleContext } from "#/shared/config/index.ts";

export interface OptionKey<Value> {
  readonly key: string;
  readonly fallback: Value;
}

const isList = (value: unknown): value is readonly unknown[] => Arr.isArray(value);

const strings = (value: readonly unknown[]): readonly string[] =>
  pipe(value, Arr.filter(Predicate.isString));

const optionAs =
  <Value>(guard: (value: unknown) => value is Value) =>
  (key: string) =>
  (context: RuleContext): Option.Option<Value> =>
    pipe(Option.fromNullishOr(context.options[key]), Option.filter(guard));

export const stringOption = optionAs(Predicate.isString);

export const stringsOption =
  ({ key, fallback }: OptionKey<readonly string[]>) =>
  (context: RuleContext): readonly string[] =>
    pipe(
      optionAs(isList)(key)(context),
      Option.map(strings),
      Option.getOrElse(() => fallback),
    );

export const stringListsOption =
  (key: string) =>
  (context: RuleContext): readonly (readonly string[])[] =>
    pipe(
      optionAs(isList)(key)(context),
      Option.map((items) => pipe(items, Arr.filter(isList), Arr.map(strings))),
      Option.getOrElse((): readonly (readonly string[])[] => []),
    );

export const numberOption =
  ({ key, fallback }: OptionKey<number>) =>
  (context: RuleContext): number =>
    pipe(
      optionAs(Predicate.isNumber)(key)(context),
      Option.getOrElse(() => fallback),
    );
