import { Array as Arr, Option, Record as Rec, Schema, pipe } from "effect";

import { entryNameOf } from "#/entities/package/index.ts";
import type { PackedWorkspace } from "#/entities/package/index.ts";
import { keysOf } from "#/shared/lib/keys.ts";

import { always, never } from "./consumer-bundle.ts";
import type { Effectful } from "./consumer-bundle.ts";

const Versions = Schema.Record(Schema.String, Schema.String);
const PeerMeta = Schema.Struct({ optional: Schema.optional(Schema.Boolean) });

export const Manifest = Schema.Struct({
  name: Schema.optional(Schema.String),
  exports: Schema.optional(Schema.Unknown),
  bin: Schema.optional(Schema.Unknown),
  sideEffects: Schema.optional(Schema.Unknown),
  dependencies: Schema.optional(Versions),
  peerDependencies: Schema.optional(Versions),
  optionalDependencies: Schema.optional(Versions),
  peerDependenciesMeta: Schema.optional(Schema.Record(Schema.String, PeerMeta)),
});

type ManifestFields = typeof Manifest.Type;

export const runtimeDependenciesOf = ({
  dependencies,
  peerDependencies,
  optionalDependencies,
}: ManifestFields): readonly string[] =>
  pipe([dependencies, peerDependencies, optionalDependencies], Arr.flatMap(keysOf), Arr.dedupe);

export const optionalPeersOf = ({ peerDependenciesMeta }: ManifestFields): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(peerDependenciesMeta),
    Option.map(Rec.filter(({ optional }) => optional === true)),
    Option.map(Rec.keys),
    Option.getOrElse((): readonly string[] => []),
  );

const decode = Schema.decodeOption(Schema.fromJsonString(Manifest));

export const manifestOf = (text: string): Option.Option<typeof Manifest.Type> => decode(text);

export interface Declared {
  readonly effectful: Effectful;
  readonly entries: ReadonlySet<string>;
  readonly complete: boolean;
  readonly claimed: boolean;
}

export interface Locator {
  readonly workspace: PackedWorkspace;
  readonly join: (target: string) => string;
}

const isFileList = Schema.is(Schema.Array(Schema.String));

const sourcesOf = (workspace: PackedWorkspace, target: string): readonly string[] =>
  pipe(
    workspace.packEntries,
    Arr.filter((entry) => entry.name === entryNameOf(target)),
    Arr.map((entry) => entry.source),
  );

const listedSources = (declared: readonly string[], { workspace, join }: Locator): Set<string> =>
  new Set(
    pipe(
      declared,
      Arr.flatMap((target) => Arr.append(sourcesOf(workspace, target), join(target))),
    ),
  );

export interface Declaration {
  readonly declared: unknown;
  readonly locator: Locator;
}

export const declaredBy = ({ declared, locator }: Declaration): Declared => {
  if (declared === false) {
    return { effectful: never, entries: new Set(), complete: true, claimed: true };
  }
  if (!isFileList(declared)) {
    return { effectful: always, entries: new Set(), complete: false, claimed: false };
  }
  const sources = listedSources(declared, locator);
  return {
    effectful: (id) => sources.has(id),
    entries: sources,
    complete: false,
    claimed: true,
  };
};
