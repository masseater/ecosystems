import { withTypeInformation } from "@r_masseater/oxlint-typed-rules";
import type { ParserServices, TypedContext } from "@r_masseater/oxlint-typed-rules";
import { Option, pipe } from "effect";
import type { Rule, RuleMeta, Visitor } from "vite-plus/lint/plugins";

export interface TypedRuleParts {
  readonly meta: RuleMeta;
  readonly visitorOf: (context: TypedContext, services: ParserServices) => Visitor;
}

export const typedRuleOf = ({ meta, visitorOf }: TypedRuleParts): Rule =>
  withTypeInformation({
    meta,
    create: (context: TypedContext) =>
      pipe(
        Option.fromNullishOr(context.sourceCode.parserServices),
        Option.match({
          onNone: (): Visitor => ({}),
          onSome: (services) => visitorOf(context, services),
        }),
      ),
  });
