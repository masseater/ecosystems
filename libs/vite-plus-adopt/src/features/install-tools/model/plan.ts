import {
  Array as Arr,
  Effect,
  Function as Fn,
  Option,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import type { ToolsSection } from "#/shared/config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

/** @internal */
export interface Planned {
  readonly name: string;
  readonly version: string;
  readonly platform: string;
  readonly url: string;
  readonly bins: readonly string[];
}

const SEPARATOR = "/";
const PLACEHOLDER = "{version}";
const DATA_FIRST_ARITY = 2;

const withVersion =
  (version: string) =>
  (template: string): string =>
    Str.replaceAll(PLACEHOLDER, version)(template);

const defaultBase = (name: string): Option.Option<string> =>
  Option.liftPredicate(`https://github.com/${name}/releases/download/v${PLACEHOLDER}`, () =>
    Str.includes(SEPARATOR)(name),
  );

const binsOf = (name: string, bin: readonly string[] | undefined): readonly string[] =>
  Option.getOrElse(Option.fromNullishOr(bin), () => [
    pipe(
      Str.split(SEPARATOR)(name),
      Arr.last,
      Option.getOrElse(() => name),
    ),
  ]);

const planOne =
  (platform: string) =>
  ([name, source]: readonly [string, ToolsSection[string]]): Effect.Effect<
    Option.Option<Planned>,
    VpToolsError
  > => {
    const file = Rec.get(source.assets, platform);
    if (Option.isNone(file)) {
      return Effect.succeedNone;
    }
    const base = Option.orElse(Option.fromNullishOr(source.base), () => defaultBase(name));
    if (Option.isNone(base)) {
      return Effect.fail(checksFailed(`vite.config "tools": ${name} needs a "base" URL`));
    }
    const render = withVersion(source.version);
    return Effect.succeedSome({
      name,
      version: source.version,
      platform,
      url: `${render(base.value)}/${render(file.value)}`,
      bins: binsOf(name, source.bin),
    });
  };

/** @internal */
export const planTools: {
  (platform: string): (section: ToolsSection) => Effect.Effect<readonly Planned[], VpToolsError>;
  (section: ToolsSection, platform: string): Effect.Effect<readonly Planned[], VpToolsError>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (section: ToolsSection, platform: string): Effect.Effect<readonly Planned[], VpToolsError> =>
    pipe(
      Rec.toEntries(section),
      Effect.forEach(planOne(platform), { concurrency: 1 }),
      Effect.map(Arr.getSomes),
    ),
);
