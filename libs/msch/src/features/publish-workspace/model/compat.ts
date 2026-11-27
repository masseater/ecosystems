import { mustSucceed, outputOf } from "@r_masseater/github-workflow";
import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Schema,
  pipe,
} from "effect";
import semver from "semver";

import {
  IncompatiblePackage,
  VITE_PLUS,
  compatManifestIn,
  compatCasesOf,
  smokeTargetsOf,
  viteAliasOf,
} from "./compat-manifest.ts";
import type { CompatCase, CompatManifest } from "./compat-manifest.ts";
import { workspaceTarballs } from "./compat-workspace.ts";
import type { Tarballs } from "./compat-workspace.ts";

const MANIFEST_FILE = "package.json";
const INSTALL_FLAGS = ["--no-audit", "--no-fund"];

const LOAD_FAILURE = String.raw`/ERR_(MODULE_NOT_FOUND|PACKAGE_|INVALID_PACKAGE|UNKNOWN_FILE|UNSUPPORTED_DIR|REQUIRE_ESM)|SyntaxError/u`;

const IMPORT_ONLY = "await import(process.argv[1])";

const SPAWN_CHECKED = `import { spawnSync } from "node:child_process"; const { stderr } = spawnSync(process.execPath, process.argv.slice(1), { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"], timeout: 60000 }); if (${LOAD_FAILURE}.test(stderr)) { process.stderr.write(stderr); process.exit(1); }`;

const Versions = Schema.String.pipe(Schema.Array, Schema.fromJsonString);
const ConsumerJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

const installedNode = Effect.fn("compat.node")(function* installedNode(
  directory: string,
  range: string,
) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  const listed = yield* outputOf({
    command: "npm",
    args: ["view", "node", "versions", "--json"],
    cwd: directory,
  });
  const versions = yield* Schema.decodeEffect(Versions)(listed);
  const version = yield* Effect.fromOption(
    Option.fromNullishOr(semver.maxSatisfying([...versions], range)),
  ).pipe(
    Effect.mapError(() =>
      IncompatiblePackage.make({ message: `No Node.js release satisfies ${range}` }),
    ),
  );
  yield* mustSucceed({
    command: "npm",
    args: ["install", ...INSTALL_FLAGS, `node@${version}`],
    cwd: directory,
  });
  return { version, binary: path.join(directory, "node_modules", "node", "bin", "node") };
});

interface Consumer {
  readonly peers: Readonly<Record<string, string>>;
  readonly tarballs: Tarballs;
}

const fileEntries = (tarballs: Tarballs): readonly (readonly [string, string])[] =>
  pipe(
    Rec.toEntries(tarballs),
    Arr.map(([name, file]): readonly [string, string] => [name, `file:${file}`]),
  );

const siblingOverrides = (tarballs: Tarballs): readonly (readonly [string, string])[] =>
  pipe(
    Rec.keys(tarballs),
    Arr.map((sibling): readonly [string, string] => [sibling, `$${sibling}`]),
  );

const consumerJson = Effect.fn("compat.json")(function* consumerJson({
  peers,
  tarballs,
}: Consumer) {
  const dependencies = Rec.fromEntries([...Rec.toEntries(peers), ...fileEntries(tarballs)]);
  return yield* Schema.encodeEffect(ConsumerJson)({
    private: true,
    type: "module",
    dependencies,
    overrides: Rec.fromEntries(siblingOverrides(tarballs)),
  });
});

const withViteOfVitePlus = Effect.fn("compat.vite")(function* withViteOfVitePlus(
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(
    path.join(directory, "node_modules", VITE_PLUS, MANIFEST_FILE),
  );
  yield* Option.match(viteAliasOf(text), {
    onNone: () => Effect.void,
    onSome: (alias) =>
      mustSucceed({
        command: "npm",
        args: ["install", "--ignore-scripts", "--force", ...INSTALL_FLAGS, alias],
        cwd: directory,
      }),
  });
});

const installedConsumer = Effect.fn("compat.consumer")(function* installedConsumer(
  root: string,
  consumer: Consumer,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = path.join(root, "consumer");
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  const text = yield* consumerJson(consumer);
  yield* fileSystem.writeFileString(path.join(directory, MANIFEST_FILE), text);
  yield* mustSucceed({
    command: "npm",
    args: ["install", "--ignore-scripts", ...INSTALL_FLAGS],
    cwd: directory,
  });
  if (Rec.has(consumer.peers, VITE_PLUS)) {
    yield* withViteOfVitePlus(directory);
  }
  return directory;
});

interface Started {
  readonly runtime: string;
  readonly consumer: string;
  readonly args: readonly string[];
}

const loadsCleanly = ({ runtime, consumer, args }: Started): ReturnType<typeof mustSucceed> =>
  mustSucceed({
    command: runtime,
    args: ["--input-type=module", "-e", SPAWN_CHECKED, "--", ...args],
    cwd: consumer,
  });

const smoke = Effect.fn("compat.smoke")(function* smoke(
  manifest: CompatManifest,
  runtime: string,
  consumer: string,
) {
  const path = yield* Path.Path;
  const { imports, bins } = smokeTargetsOf(manifest);
  const importer = ["--input-type=module", "-e", IMPORT_ONLY];
  yield* Effect.forEach(
    imports,
    (specifier) => loadsCleanly({ runtime, consumer, args: [...importer, specifier] }),
    { concurrency: 1, discard: true },
  );
  yield* Effect.forEach(
    bins,
    (file) =>
      loadsCleanly({
        runtime,
        consumer,
        args: [path.join(consumer, "node_modules", manifest.name, file), "--help"],
      }),
    { concurrency: 1, discard: true },
  );
});

interface Run {
  readonly manifest: CompatManifest;
  readonly tarballs: Tarballs;
  readonly compat: CompatCase;
}

const runCase = Effect.fn("compat.case")(function* runCase({ manifest, tarballs, compat }: Run) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  const runtime = yield* installedNode(path.join(root, "runtime"), compat.node);
  const consumer = yield* installedConsumer(root, { peers: compat.peers, tarballs });
  const peers = pipe(
    Rec.toEntries(compat.peers),
    Arr.map(([name, range]) => `${name}@${range}`),
    Arr.join(", "),
  );
  yield* Console.log(
    `${manifest.name} ${compat.label}: Node.js ${runtime.version}, peers ${peers}`,
  );
  yield* smoke(manifest, runtime.binary, consumer);
}, Effect.scoped);

/** @internal */
export const checkCompat = Effect.fn("publish.compat")(function* checkCompat(directory: string) {
  const manifest = yield* compatManifestIn(directory);
  const cases = compatCasesOf(manifest);
  if (Arr.isReadonlyArrayEmpty(cases)) {
    return yield* IncompatiblePackage.make({
      message: `${manifest.name} declares no engines.node, so there is no supported Node.js range to check`,
    });
  }
  const tarballs = yield* workspaceTarballs(directory, manifest);
  return yield* Effect.forEach(cases, (compat) => runCase({ manifest, tarballs, compat }), {
    concurrency: 1,
    discard: true,
  });
}, Effect.scoped);
