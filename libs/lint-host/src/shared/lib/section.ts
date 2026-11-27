import { Array as Arr, Function as Fn, Option, Predicate, pipe } from "effect";

export interface SectionRequest<Config extends object> {
  readonly name: string;
  readonly fallback: Config;
  readonly prepare?: (section: Config) => Config;
}

export const sectionOf = <Config extends object>({
  name,
  fallback,
  prepare = Fn.identity,
}: SectionRequest<Config>): ((config: unknown) => Config) => {
  const hasSection = (value: unknown): value is Readonly<Record<string, Config>> =>
    Predicate.hasProperty(value, name) && Predicate.isObject(value[name]);
  return (config) =>
    pipe(
      Option.liftPredicate(config, hasSection),
      Option.flatMapNullishOr((value) => value[name]),
      Option.map(prepare),
      Option.getOrElse(() => fallback),
    );
};

export interface Ignoring {
  readonly ignores?: readonly string[] | undefined;
}

export interface Pathspecs {
  readonly defaults: readonly string[];
  readonly unowned?: readonly string[];
}

export const pathspecsOf =
  ({ defaults, unowned = [] }: Pathspecs) =>
  ({
    config,
    patterns = [],
  }: {
    readonly config: Ignoring;
    readonly patterns?: readonly string[];
  }): readonly string[] => [
    ...Arr.match(patterns, { onEmpty: () => defaults, onNonEmpty: Fn.identity }),
    ...unowned,
    ...pipe(
      config.ignores ?? [],
      Arr.map((glob) => `:(glob,exclude)${glob}`),
    ),
  ];
