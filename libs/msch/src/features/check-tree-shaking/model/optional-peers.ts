import { Array as Arr, Option, String as Str, pipe } from "effect";

import { isBinEntry } from "#/entities/package/index.ts";
import { keysOf } from "#/shared/lib/keys.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import type { Used } from "./usage.ts";

const RULE: RuleName = "optional-peer";
const REQUIRED_RULE: RuleName = "required-peer";
const START = 0;
const SINGLE = 1;
const DEPENDENCIES_KEY = '"dependencies"';
const PEER_META_KEY = '"peerDependenciesMeta"';

export interface Located {
  readonly file: string;
  readonly source: string;
}

const importsPackage =
  (name: string) =>
  ({ packages }: Used): boolean =>
    Arr.contains(packages, name);

const labelsOf = (importers: readonly Used[]): string =>
  pipe(
    importers,
    Arr.map(({ entry }) => `\`${entry.label}\``),
    Arr.dedupe,
    Arr.join(", "),
  );

const positionIn = (
  located: Located,
  key: string,
  name: string,
): Pick<Problem, "line" | "column"> => {
  const section = Option.getOrElse(Str.indexOf(key)(located.source), () => START);
  const rest = Str.slice(section)(located.source);
  return positionOf(located.source)(
    section + Option.getOrElse(Str.indexOf(`"${name}"`)(rest), () => START),
  );
};

const problemFor = (located: Located, name: string, importers: readonly Used[]): Problem => ({
  file: located.file,
  ...positionIn(located, DEPENDENCIES_KEY, name),
  rule: RULE,
  message: `${name} is imported only from ${labelsOf(importers)}, so installing the other entries must not require it. Move it to peerDependencies, mark it optional in peerDependenciesMeta and keep it in devDependencies.`,
});

export interface Peering {
  readonly located: Located;
  readonly dependencies: Readonly<Record<string, string>> | undefined;
  readonly used: readonly Used[];
}

export const optionalPeerProblems = ({
  located,
  dependencies,
  used,
}: Peering): readonly Problem[] => {
  const libraries = pipe(
    used,
    Arr.filter(({ entry }) => !isBinEntry(entry)),
  );
  const bins = pipe(
    used,
    Arr.filter(({ entry }) => isBinEntry(entry)),
  );
  if (libraries.length <= SINGLE) {
    return [];
  }
  return pipe(
    keysOf(dependencies),
    Arr.flatMap((name) => {
      const importers = pipe(libraries, Arr.filter(importsPackage(name)));
      const neededByBin = pipe(bins, Arr.some(importsPackage(name)));
      const partial = importers.length > START && importers.length < libraries.length;
      if (!partial || neededByBin) {
        return [];
      }
      return [problemFor(located, name, importers)];
    }),
  );
};

export interface OptionalPeering {
  readonly located: Located;
  readonly optional: readonly string[];
  readonly used: readonly Used[];
}

export const requiredPeerProblems = ({
  located,
  optional,
  used,
}: OptionalPeering): readonly Problem[] => {
  const libraries = pipe(
    used,
    Arr.filter(({ entry }) => !isBinEntry(entry)),
  );
  return pipe(
    optional,
    Arr.flatMap((name) => {
      const bins = pipe(
        used,
        Arr.filter((entry) => isBinEntry(entry.entry) && importsPackage(name)(entry)),
      );
      const everyLibrary = pipe(
        libraries,
        Option.liftPredicate(
          (all) => Arr.isArrayNonEmpty(all) && pipe(all, Arr.every(importsPackage(name))),
        ),
        Option.getOrElse((): readonly Used[] => []),
      );
      const importers = Arr.appendAll(bins, everyLibrary);
      if (!Arr.isArrayNonEmpty(importers)) {
        return [];
      }
      return [
        {
          file: located.file,
          ...positionIn(located, PEER_META_KEY, name),
          rule: REQUIRED_RULE,
          message: `${name} is an optional peer, but ${labelsOf(importers)} import it at startup, so installing the package without it breaks them. Move it to dependencies.`,
        },
      ];
    }),
  );
};
