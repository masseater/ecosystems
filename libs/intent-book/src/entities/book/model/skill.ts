import { Effect, Option, pipe, Record, Schema, String as Str } from "effect";
import { parse } from "yaml";

export interface Reference {
  readonly file: string;
  readonly text: string;
}

export interface Skill {
  readonly name: string;
  readonly description: string;
  readonly type: Option.Option<string>;
  readonly framework: Option.Option<string>;
  readonly libraryVersion: Option.Option<string>;
  readonly requires: readonly string[];
  readonly sources: readonly string[];
  readonly text: string;
  readonly body: string;
  readonly references: readonly Reference[];
}

const taggedError = Schema.TaggedError;

export class SkillFormatError extends taggedError<
  SkillFormatError,
  { readonly brand: unique symbol }
>()("SkillFormatError", { skill: Schema.String, reason: Schema.String }) {}

const Scalar = Schema.Union([Schema.String, Schema.Finite]);
const OptionalText = Schema.String.pipe(Schema.optionalKey);
const OptionalScalar = Scalar.pipe(Schema.optionalKey);
const OptionalList = Schema.Array(Schema.String).pipe(Schema.optionalKey);

const Metadata = Schema.Struct({
  type: OptionalText,
  framework: OptionalText,
  library_version: OptionalScalar,
});

const Frontmatter = Schema.Struct({
  description: Schema.String,
  type: OptionalText,
  framework: OptionalText,
  library_version: OptionalScalar,
  metadata: Metadata.pipe(Schema.optionalKey),
  requires: OptionalList,
  sources: OptionalList,
});

type FrontmatterData = typeof Frontmatter.Type;

const FRONTMATTER = /^---[ \t]*\r?\n(?<yaml>[\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)(?<body>[\s\S]*)$/u;
const WHITESPACE = /\s+/gu;
const NO_ENTRIES: readonly string[] = [];

const decodeFrontmatter = Schema.decodeUnknownEffect(Frontmatter);

const splitFrontmatter = (
  text: string,
): Option.Option<{ readonly yaml: string; readonly body: string }> =>
  Str.match(FRONTMATTER)(text).pipe(
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) =>
      Option.all({ yaml: Record.get(groups, "yaml"), body: Record.get(groups, "body") }),
    ),
  );

const failed = (skill: string, reason: string): SkillFormatError =>
  SkillFormatError.make({ skill, reason });

const textOfScalar = (value: Option.Option<string | number>): Option.Option<string> =>
  value.pipe(Option.map((scalar) => globalThis.String(scalar)));

const metadataOr = <Value>(
  frontmatter: FrontmatterData,
  read: (
    source: Readonly<Pick<FrontmatterData, "type" | "framework" | "library_version">>,
  ) => Value | undefined,
): Option.Option<Value> =>
  Option.fromNullishOr(frontmatter.metadata).pipe(
    Option.flatMapNullishOr(read),
    Option.orElse(() => Option.fromNullishOr(read(frontmatter))),
  );

export const parseSkill = Effect.fn("parseSkill")(function* parseSkill(
  input: Readonly<{
    name: string;
    text: string;
    references: readonly { readonly file: string; readonly text: string }[];
  }>,
) {
  const parts = yield* splitFrontmatter(input.text).pipe(
    Effect.fromOption,
    Effect.mapError(() => failed(input.name, "SKILL.md has no frontmatter")),
  );
  const data: unknown = yield* Effect.try({
    try: (): unknown => parse(parts.yaml),
    catch: (cause) => failed(input.name, `frontmatter is not YAML: ${globalThis.String(cause)}`),
  });
  const frontmatter = yield* decodeFrontmatter(data).pipe(
    Effect.mapError((error) => failed(input.name, error.message)),
  );
  const skill: Skill = {
    name: input.name,
    description: pipe(frontmatter.description, Str.replaceAll(WHITESPACE, " "), Str.trim),
    type: metadataOr(frontmatter, (source) => source.type),
    framework: metadataOr(frontmatter, (source) => source.framework),
    libraryVersion: textOfScalar(metadataOr(frontmatter, (source) => source.library_version)),
    requires: frontmatter.requires ?? NO_ENTRIES,
    sources: frontmatter.sources ?? NO_ENTRIES,
    text: input.text,
    body: parts.body,
    references: input.references,
  };
  return skill;
});
