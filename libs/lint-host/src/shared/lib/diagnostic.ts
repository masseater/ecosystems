import { Array as Arr, Option, pipe } from "effect";

export interface Reportable {
  readonly path: string;
  readonly line: number;
  readonly column?: number | undefined;
  readonly rule: string;
  readonly message: string;
  readonly detail?: string | undefined;
  readonly context?: string | undefined;
  readonly severity: string;
}

export const diagnosticDetail = (diagnostic: Reportable): string =>
  pipe(
    [diagnostic.detail, diagnostic.context],
    Arr.flatMap((part) => Option.toArray(Option.fromNullishOr(part))),
    Arr.filter((part) => part !== ""),
    Arr.map((part) => ` [${part}]`),
    Arr.join(""),
  );

export const formatDiagnostic = (diagnostic: Reportable): string => {
  const column = pipe(
    Option.fromNullishOr(diagnostic.column),
    Option.map((value) => `:${String(value)}`),
    Option.getOrElse(() => ""),
  );
  return `${diagnostic.path}:${String(diagnostic.line)}${column} ${diagnostic.severity} ${diagnostic.rule} ${diagnostic.message}${diagnosticDetail(diagnostic)}`;
};
