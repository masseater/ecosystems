import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

const START = 0;

/** @internal */
export type Fields = Readonly<Record<string, unknown>>;

const FieldsSchema = Schema.Record(Schema.String, Schema.Unknown);
const decodeFields = Schema.decodeUnknownOption(FieldsSchema);
const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(FieldsSchema));
const decodeString = Schema.decodeUnknownOption(Schema.String);

/** @internal */
export const decodeManifest = (source: string): Option.Option<Fields> => decodeJson(source);

/** @internal */
export const fieldsOf = (value: unknown): Fields =>
  Option.getOrElse(decodeFields(value), () => ({}));

/** @internal */
export interface Specified {
  readonly name: string;
  readonly specifier: string;
}

/** @internal */
export const specifiedIn = (held: unknown): readonly Specified[] =>
  pipe(
    fieldsOf(held),
    Rec.toEntries,
    Arr.flatMap(([name, value]) =>
      pipe(
        decodeString(value),
        Option.map((specifier) => ({ name, specifier })),
        Option.toArray,
      ),
    ),
  );

/** @internal */
export const quoted = (text: string): string =>
  Str.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)(text);

/** @internal */
export const manifestPattern = ({ name, specifier }: Specified): RegExp =>
  new RegExp(`"${quoted(name)}"\\s*:\\s*"${quoted(specifier)}"`, "u");

/** @internal */
export const offsetIn =
  (source: string) =>
  (pattern: RegExp): number =>
    pipe(
      Option.fromNullishOr(pattern.exec(source)),
      Option.map(({ index }) => index),
      Option.getOrElse(() => START),
    );

const SECTIONS = ["dependencies", "devDependencies", "optionalDependencies"] as const;

/** @internal */
export const manifestSpecifiers = (source: string): readonly Specified[] =>
  pipe(
    decodeJson(source),
    Option.map((manifest) =>
      pipe(
        SECTIONS,
        Arr.flatMap((section) => specifiedIn(manifest[section])),
      ),
    ),
    Option.getOrElse((): readonly Specified[] => []),
  );
