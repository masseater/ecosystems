import { Array as Arr, Option, pipe } from "effect";

import { asBoolean, childrenOf, consteval } from "#/app/presets/entities/expression-tree/index.ts";
import type { Spanned } from "#/app/presets/entities/expression-tree/index.ts";
import {
  atRaw,
  confidence,
  finding,
  severity,
} from "#/app/presets/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  rootLocation,
  subfeatureLocation,
} from "#/app/presets/features/audit-workflows/lib/location.ts";
import { parsedFenced, supportsTemplates } from "#/app/presets/features/audit-workflows/lib/raw.ts";
import type { Audit } from "#/app/presets/features/audit-workflows/model/audit.ts";
import { subfeatureOf } from "#/app/presets/shared/subfeature/index.ts";

const meta = { ident: "unsound-ternary", desc: "unsound pseudo-ternary expression" } as const;

const isConstant = (spanned: Spanned): boolean => Option.isSome(consteval(spanned.expr));

const isFalsy = (spanned: Spanned): boolean =>
  Option.exists(consteval(spanned.expr), (value) => !asBoolean(value));

const orOperands = (spanned: Spanned): readonly Spanned[] => {
  const { expr } = spanned;
  if (!isConstant(spanned) && expr.type === "binary" && expr.op === "or") {
    return [...orOperands(expr.lhs), ...orOperands(expr.rhs)];
  }
  return [spanned];
};

type Collect = (spanned: Spanned) => readonly Spanned[];

const LAST = 1;
const ANNOTATION = pipe(
  rootLocation(""),
  annotated("pseudo-ternary has falsy true value"),
  primary,
);

const falsyTrueValue = (operand: Spanned): readonly Spanned[] => {
  const { expr } = operand;
  if (expr.type === "binary" && expr.op === "and" && isFalsy(expr.rhs)) {
    return [expr.rhs];
  }
  return [];
};

const orValues =
  (collect: Collect) =>
  (spanned: Spanned): readonly Spanned[] => {
    const operands = orOperands(spanned);
    const falsy = pipe(operands, Arr.dropRight(LAST), Arr.flatMap(falsyTrueValue));
    return [...falsy, ...pipe(operands, Arr.flatMap(collect))];
  };

const unsoundTrueValues: Collect = (spanned) => {
  const { expr } = spanned;
  if (isConstant(spanned)) {
    return [];
  }
  if (expr.type === "binary" && expr.op === "or") {
    return orValues(unsoundTrueValues)(spanned);
  }
  return pipe(childrenOf(expr), Arr.flatMap(unsoundTrueValues));
};

export const unsoundTernary: Audit = {
  ...meta,
  raw: (input) => {
    if (!supportsTemplates(input)) {
      return [];
    }
    const locate = subfeatureLocation(input.document);
    return Arr.flatMap(parsedFenced(input), (span) =>
      Arr.map(unsoundTrueValues(span.parsed), (value) => {
        const at = subfeatureOf(span.start + value.origin.start)(value.origin.raw);
        return pipe(
          finding(meta),
          confidence("high"),
          severity("low"),
          atRaw(locate(ANNOTATION, at)),
        );
      }),
    );
  },
};
