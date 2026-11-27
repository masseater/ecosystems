import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import semver from "semver";

const PACKAGE_JSON_EXPORT = "./package.json";
const PATTERN = "*";
const ROOT_EXPORT = ".";
const UNVERSIONED = "0.0.0";
const VITE = "vite";

/** @internal */
export const VITE_PLUS = "vite-plus";
const TYPES = "types";

const taggedError = Schema.TaggedError;

/** @internal */
export class IncompatiblePackage extends taggedError<
  IncompatiblePackage,
  { readonly brand: unique symbol }
>()("IncompatiblePackage", { message: Schema.String }) {}

const Declared = Schema.Record(Schema.String, Schema.String);

const VitePlusManifestJson = Schema.fromJsonString(
  Schema.Struct({ dependencies: Schema.optionalKey(Declared) }),
);

const Bin = Schema.Union([Schema.String, Declared]);

const Native = Schema.Struct({ binary: Schema.String, targets: Schema.Array(Schema.String) });

const Engines = Schema.Struct({ node: Schema.optionalKey(Schema.String) });

const PublishConfig = Schema.Struct({
  exports: Schema.optionalKey(Schema.Unknown),
  bin: Schema.optionalKey(Bin),
});

/** @internal */
export const CompatManifestJson = Schema.fromJsonString(
  Schema.Struct({
    name: Schema.String,
    version: Schema.String,
    private: Schema.optionalKey(Schema.Boolean),
    native: Schema.optionalKey(Native),
    exports: Schema.optionalKey(Schema.Unknown),
    bin: Schema.optionalKey(Bin),
    dependencies: Schema.optionalKey(Declared),
    optionalDependencies: Schema.optionalKey(Declared),
    engines: Schema.optionalKey(Engines),
    peerDependencies: Schema.optionalKey(Declared),
    publishConfig: Schema.optionalKey(PublishConfig),
  }),
);

/** @internal */
export type CompatManifest = typeof CompatManifestJson.Type;

/** @internal */
export interface CompatCase {
  readonly label: "floor" | "latest";
  readonly node: string;
  readonly peers: Readonly<Record<string, string>>;
}

/** @internal */
export interface SmokeTargets {
  readonly imports: readonly string[];
  readonly bins: readonly string[];
}

type Pair = readonly [string, string];

const lowestOf = (range: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(semver.validRange(range)),
    Option.flatMap(() => Option.fromNullishOr(semver.minVersion(range))),
    Option.map(({ version }) => version),
  );

const floorOf = (version: string): string => {
  if (semver.prerelease(version) !== null) {
    return version;
  }
  return `~${String(semver.major(version))}.${String(semver.minor(version))}.0`;
};

const pinnedPeer = ([name, range]: Pair): readonly Pair[] =>
  Option.match(lowestOf(range), {
    onNone: (): readonly Pair[] => [],
    onSome: (version): readonly Pair[] => {
      if (version === UNVERSIONED) {
        return [[name, range]];
      }
      return [[name, floorOf(version)]];
    },
  });

const floorPeers = (peers: Readonly<Record<string, string>>): Readonly<Record<string, string>> =>
  pipe(Rec.toEntries(peers), Arr.flatMap(pinnedPeer), Rec.fromEntries);

const nodeFloorOf = (manifest: CompatManifest): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(manifest.engines),
    Option.flatMap(({ node }) => Option.fromUndefinedOr(node)),
    Option.flatMap(lowestOf),
  );

const withoutViteOfVitePlus = (
  peers: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> => {
  if (Rec.has(peers, VITE_PLUS)) {
    return Rec.remove(peers, VITE);
  }
  return peers;
};

/** @internal */
export const viteAliasOf = (vitePlusManifest: string): Option.Option<string> =>
  pipe(
    Schema.decodeUnknownOption(VitePlusManifestJson)(vitePlusManifest),
    Option.flatMapNullishOr(({ dependencies }) => dependencies),
    Option.flatMap(Rec.get(VITE)),
    Option.map((spec) => `${VITE}@${spec}`),
  );

const casesOf = (manifest: CompatManifest, floor: string): readonly CompatCase[] => {
  const declared = withoutViteOfVitePlus(manifest.peerDependencies ?? {});
  return [
    { label: "floor", node: floorOf(floor), peers: floorPeers(declared) },
    { label: "latest", node: `^${String(semver.major(floor))}`, peers: declared },
  ];
};

/** @internal */
export const compatCasesOf = (manifest: CompatManifest): readonly CompatCase[] =>
  pipe(
    nodeFloorOf(manifest),
    Option.match({
      onNone: (): readonly CompatCase[] => [],
      onSome: (floor): readonly CompatCase[] => casesOf(manifest, floor),
    }),
  );

const isTypesOnly = (target: Option.Option<unknown>): boolean =>
  Option.match(target, {
    onNone: () => false,
    onSome: (value) =>
      Predicate.isReadonlyObject(value) &&
      pipe(
        Rec.keys(value),
        Arr.every((key) => key === TYPES),
      ),
  });

const subpathsOf = (exports: unknown): readonly string[] => {
  if (Predicate.isString(exports)) {
    return [ROOT_EXPORT];
  }
  if (Predicate.isReadonlyObject(exports)) {
    const keys = Rec.keys(exports);
    if (pipe(keys, Arr.every(Str.startsWith(ROOT_EXPORT)))) {
      return pipe(
        keys,
        Arr.filter((key) => key !== PACKAGE_JSON_EXPORT && !Str.includes(PATTERN)(key)),
        Arr.filter((key) => !isTypesOnly(Rec.get(exports, key))),
      );
    }
    return [ROOT_EXPORT];
  }
  return [];
};

const specifierOf = (name: string, subpath: string): string => {
  if (subpath === ROOT_EXPORT) {
    return name;
  }
  return `${name}${Str.replace(ROOT_EXPORT, "")(subpath)}`;
};

const binFilesOf = (bin: CompatManifest["bin"]): readonly string[] => {
  if (Predicate.isUndefined(bin)) {
    return [];
  }
  if (Predicate.isString(bin)) {
    return [bin];
  }
  return Rec.values(bin);
};

/** @internal */
export const smokeTargetsOf = (manifest: CompatManifest): SmokeTargets => {
  const published = Option.fromUndefinedOr(manifest.publishConfig);
  const exports = pipe(
    published,
    Option.flatMap(({ exports: own }) => Option.fromUndefinedOr(own)),
    Option.getOrElse(() => manifest.exports),
  );
  const bin = pipe(
    published,
    Option.flatMap(({ bin: own }) => Option.fromUndefinedOr(own)),
    Option.getOrElse(() => manifest.bin),
  );
  return {
    imports: pipe(
      subpathsOf(exports),
      Arr.map((subpath) => specifierOf(manifest.name, subpath)),
    ),
    bins: binFilesOf(bin),
  };
};

/** @internal */
export const compatManifestIn = Effect.fn("compat.manifestIn")(function* compatManifestIn(
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, "package.json"));
  return yield* Schema.decodeEffect(CompatManifestJson)(text);
});
