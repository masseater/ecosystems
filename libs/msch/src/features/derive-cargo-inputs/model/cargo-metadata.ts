import { toPosix } from "@masseater.dev/path-kit";
import { Array as Arr, Record as Rec, Schema, String as Str, pipe } from "effect";

import { reachable } from "#/shared/lib/reachable.ts";

export const LOCK_FILE = "Cargo.lock";
export const MANIFEST_FILE = "Cargo.toml";
export const WORKSPACE_CACHE = "node_modules/.cache/msch/cargo-workspace.json";
const LAST_SEGMENT = /\/[^/]*$/u;

const IgnoredDirectory = Schema.Struct({
  pattern: Schema.String,
  base: Schema.Literal("workspace"),
});
const CargoPackageSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  manifest_path: Schema.String,
  source: Schema.NullOr(Schema.String),
});
const CargoNode = Schema.Struct({
  id: Schema.String,
  deps: Schema.Array(Schema.Struct({ pkg: Schema.String })),
});
export const CargoMetadataSchema = Schema.Struct({
  packages: Schema.Array(CargoPackageSchema),
  resolve: Schema.Struct({ nodes: Schema.Array(CargoNode) }),
  workspace_members: Schema.Array(Schema.String),
  workspace_root: Schema.String,
});
export const CargoSourceSchema = Schema.Struct({
  metadata: CargoMetadataSchema,
  manifest: Schema.String,
});
export const CargoWorkspaceSchema = Schema.Struct({
  ...CargoSourceSchema.fields,
  ignored: Schema.Array(IgnoredDirectory),
});
export type CargoMetadata = typeof CargoMetadataSchema.Type;
export type CargoSource = typeof CargoSourceSchema.Type;
export type CargoWorkspace = typeof CargoWorkspaceSchema.Type;
export type CargoPackage = typeof CargoPackageSchema.Type;

export const directoryOf = (file: string): string =>
  pipe(toPosix(file), Str.replace(LAST_SEGMENT, ""));

export const isLocal = (entry: CargoPackage): boolean => entry.source === null;

export const closureOf =
  (metadata: CargoMetadata) =>
  (roots: readonly string[]): readonly CargoPackage[] => {
    const edges = Rec.fromEntries(
      pipe(
        metadata.resolve.nodes,
        Arr.map(
          (node) =>
            [
              node.id,
              pipe(
                node.deps,
                Arr.map(({ pkg }) => pkg),
              ),
            ] as const,
        ),
      ),
    );
    const ids = new Set(reachable(edges, roots));
    return pipe(
      metadata.packages,
      Arr.filter((entry) => ids.has(entry.id)),
    );
  };
