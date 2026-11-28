import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import type {
  NodeTypstCompileResult,
  NodeTypstDocument,
} from "@myriaddreamin/typst-ts-node-compiler";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import type { Format, Rendered, Theme } from "#/entities/figure/index.ts";
import { RenderError, failWith } from "#/shared/lib/errors.ts";

const encoder = new TextEncoder();
const SEQUENTIAL = { concurrency: 1 } as const;

export interface Mounted {
  readonly path: string;
  readonly content: Uint8Array;
}

export interface CompileRequest {
  readonly file: string;
  readonly root: string;
  readonly theme: Theme;
  readonly format: Format;
  readonly mounted: readonly Mounted[];
}

const Diagnostics = Schema.Array(Schema.Struct({ path: Schema.String, message: Schema.String }));

const renderers: Readonly<
  Record<Format, (compiler: NodeCompiler, document: NodeTypstDocument) => Rendered>
> = {
  svg: (compiler, document) => encoder.encode(compiler.svg(document)),
  pdf: (compiler, document) => compiler.pdf(document),
};

const describeFailure = (raw: readonly unknown[]): string =>
  pipe(
    Schema.decodeUnknownOption(Diagnostics)(raw),
    Option.getOrElse(() => []),
    Arr.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`),
    Arr.join("\n"),
  );

const diagnosticsOf = (compiler: NodeCompiler, compiled: NodeTypstCompileResult): string =>
  pipe(
    Option.fromNullishOr(compiled.takeDiagnostics()),
    Option.map((error): readonly unknown[] => compiler.fetchDiagnostics(error)),
    Option.match({ onNone: () => "", onSome: describeFailure }),
  );

const mapShadows = (
  compiler: NodeCompiler,
  mounted: readonly Mounted[],
): Effect.Effect<void, RenderError> =>
  Effect.forEach(
    mounted,
    (item) =>
      Effect.try({
        try: () => {
          compiler.mapShadow(item.path, Buffer.from(item.content));
        },
        catch: failWith,
      }),
    SEQUENTIAL,
  ).pipe(Effect.asVoid);

export const compileFigure = (request: CompileRequest): Effect.Effect<Rendered, RenderError> =>
  Effect.gen(function* compileDocument() {
    const compiler = yield* Effect.try({
      try: () => NodeCompiler.create({ workspace: request.root, inputs: { theme: request.theme } }),
      catch: failWith,
    });
    yield* mapShadows(compiler, request.mounted);
    const compiled = yield* Effect.try({
      try: () => compiler.compile({ mainFilePath: request.file }),
      catch: failWith,
    });
    const document = yield* Effect.fromOption(Option.fromNullishOr(compiled.result)).pipe(
      Effect.mapError(() => RenderError.make({ message: diagnosticsOf(compiler, compiled) })),
    );
    return yield* Effect.try({
      try: () => renderers[request.format](compiler, document),
      catch: failWith,
    });
  });
