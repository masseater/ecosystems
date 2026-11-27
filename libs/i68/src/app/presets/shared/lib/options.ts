import { Option, Predicate, pipe } from "effect";

import type { RuleOptions } from "#/shared/config/index.ts";

export interface NumberOption {
  readonly key: string;
  readonly fallback: number;
}

export const numberOption =
  ({ key, fallback }: NumberOption) =>
  (options: RuleOptions): number =>
    pipe(
      Option.fromNullishOr(options[key]),
      Option.filter(Predicate.isNumber),
      Option.getOrElse(() => fallback),
    );
