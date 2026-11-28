import { builtinModules } from "node:module";

import {
  Array as Arr,
  Effect,
  Option,
  Order,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { rolldown } from "vite/rolldown";
import type { InputOptions, OutputChunk } from "vite/rolldown";

import { bundleErrorDetail } from "#/shared/lib/bundle-error.ts";
import { packageNameOf } from "#/shared/lib/package-name.ts";

const VIRTUAL_PREFIX = "\0";
const VIRTUAL = `${VIRTUAL_PREFIX}tree-shaking-consumer`;
const VIRTUAL_ID = /^\0tree-shaking-consumer$/u;
const ABSOLUTE = /^(?:[A-Za-z]:)?[\\/]/u;
const NODE_PROTOCOL = "node:";
const SUBPATH_IMPORT = "#";
const RELATIVE_PREFIX = ".";
const NAMESPACE = "namespace";

const Quoted = Schema.fromJsonString(Schema.String);
const quote = (text: string): string =>
  pipe(
    Schema.encodeOption(Quoted)(text),
    Option.getOrElse(() => text),
  );
const builtins: ReadonlySet<string> = new Set(builtinModules);

export type Effectful = (id: string) => boolean;

export const always: Effectful = () => true;
export const never: Effectful = () => false;

export interface BundleScope {
  readonly declared: readonly string[];
  readonly bundled: readonly string[];
}

export interface Kept {
  readonly modules: readonly string[];
  readonly packages: readonly string[];
}

export interface Consumer {
  readonly entry: string;
  readonly member: Option.Option<string>;
}

export type BundleInput =
  | { readonly kind: "consumer"; readonly consumer: Consumer }
  | { readonly kind: "program"; readonly file: string };

const taggedError = Schema.TaggedError;

export class BundleFailed extends taggedError<BundleFailed, { readonly brand: unique symbol }>()(
  "BundleFailed",
  { detail: Schema.String },
) {}

const failed = (error: unknown): BundleFailed =>
  BundleFailed.make({ detail: bundleErrorDetail(error) });

const isBare = (specifier: string): boolean =>
  !Str.startsWith(RELATIVE_PREFIX)(specifier) &&
  !Str.startsWith(SUBPATH_IMPORT)(specifier) &&
  !ABSOLUTE.test(specifier) &&
  !Str.startsWith(VIRTUAL_PREFIX)(specifier);

const isBuiltin = (specifier: string): boolean =>
  Str.startsWith(NODE_PROTOCOL)(specifier) || builtins.has(packageNameOf(specifier));

const isExternal =
  ({ declared, bundled }: BundleScope) =>
  (specifier: string, importer: string | undefined): boolean =>
    Predicate.isNotUndefined(importer) &&
    isBare(specifier) &&
    (isBuiltin(specifier) ||
      (Arr.contains(declared, packageNameOf(specifier)) &&
        !Arr.contains(bundled, packageNameOf(specifier))));

const consumerSource = ({ entry, member }: Consumer): string =>
  Option.match(member, {
    onNone: () => `export * from ${quote(entry)};\n`,
    onSome: (name) =>
      `import * as ${NAMESPACE} from ${quote(entry)};\nglobalThis.used = ${NAMESPACE}[${quote(name)}];\n`,
  });

const baseOptions = (scope: BundleScope, effectful: Effectful): InputOptions => ({
  platform: "node",
  logLevel: "silent",
  external: isExternal(scope),
  treeshake: { moduleSideEffects: effectful },
});

const consumerPlugin = (consumer: Consumer): InputOptions["plugins"] => [
  {
    name: "tree-shaking-consumer",
    resolveId: { filter: { id: VIRTUAL_ID }, handler: (): string => VIRTUAL },
    load: { filter: { id: VIRTUAL_ID }, handler: (): string => consumerSource(consumer) },
  },
];

const optionsFor = (scope: BundleScope, input: BundleInput, effectful: Effectful): InputOptions => {
  const base = baseOptions(scope, effectful);
  if (input.kind === "program") {
    return { ...base, input: input.file };
  }
  return { ...base, input: VIRTUAL, plugins: consumerPlugin(input.consumer) };
};

const isChunk = (item: { readonly type: string }): item is OutputChunk => item.type === "chunk";

const keptBy = (chunks: readonly OutputChunk[]): Kept => ({
  modules: pipe(
    chunks,
    Arr.flatMap((chunk) => Rec.keys(chunk.modules)),
    Arr.filter((id) => !Str.startsWith(VIRTUAL_PREFIX)(id)),
    Arr.dedupe,
    Arr.sortBy(Order.String),
  ),
  packages: pipe(
    chunks,
    Arr.flatMap((chunk) => [...chunk.imports, ...chunk.dynamicImports]),
    Arr.filter((specifier) => isBare(specifier) && !isBuiltin(specifier)),
    Arr.map(packageNameOf),
    Arr.dedupe,
    Arr.sortBy(Order.String),
  ),
});

const generate = (options: InputOptions): Effect.Effect<readonly OutputChunk[], BundleFailed> =>
  Effect.acquireUseRelease(
    Effect.tryPromise({ try: () => rolldown(options), catch: failed }),
    (bundle) => Effect.tryPromise({ try: () => bundle.generate({ format: "esm" }), catch: failed }),
    (bundle) => Effect.promise(() => bundle.close()),
  ).pipe(Effect.map(({ output }) => pipe(output, Arr.filter(isChunk))));

export const keptIn = Effect.fn("keptIn")(function* keptIn(
  scope: BundleScope,
  input: BundleInput,
  effectful: Effectful,
) {
  const chunks = yield* generate(optionsFor(scope, input, effectful));
  return keptBy(chunks);
});

export const exportNamesOf = Effect.fn("exportNamesOf")(function* exportNamesOf(
  scope: BundleScope,
  entry: string,
) {
  const chunks = yield* generate(optionsFor(scope, { kind: "program", file: entry }, always));
  return pipe(
    chunks,
    Arr.flatMap((chunk) => chunk.exports),
    Arr.dedupe,
  );
});
