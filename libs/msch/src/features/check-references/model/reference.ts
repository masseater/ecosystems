import { Array as Arr, Match, Option, Result, String as Str, pipe } from "effect";

import { groupOf } from "#/shared/lib/match-groups.ts";

export interface GithubReference {
  readonly kind: "github";
  readonly owner: string;
  readonly repo: string;
  readonly path: string;
  readonly symbol: Option.Option<string>;
  readonly ref: Option.Option<string>;
}

export interface NpmReference {
  readonly kind: "npm";
  readonly name: string;
}

export type Reference = GithubReference | NpmReference;

export const REFERENCE_SCHEME = /^(?<scheme>github|npm):/u;
const BRANCH_LINK =
  /^https:\/\/github\.com\/(?<owner>[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)\/(?<repo>[\w.-]+)\/(?:tree|blob)\/(?<ref>[^/#?]+)(?:\/(?<path>[^#?]*[^/#?]))?(?:[#?].*)?$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const GITHUB_REFERENCE =
  /^github:(?<owner>[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)\/(?<repo>[\w.-]+)(?:\/(?<path>[^#]+))?(?:#(?<symbol>.+))?$/u;
const NPM_REFERENCE = /^npm:(?<name>(?:@[a-z\d~-][a-z\d._~-]*\/)?[a-z\d~-][a-z\d._~-]*)$/u;
const SYMBOL = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u;
const LINE_ANCHOR = /^L\d+(?:-L\d+)?$/u;
const UNUSABLE_SEGMENT = /^\.{0,2}$/u;
const SEPARATOR = "/";

export const NO_PATH = "";

export const GRAMMAR =
  "`github:<owner>/<repo>[/<path>][#<symbol>]` or `npm:<package>`, where the path names a file or directory of the default branch and the symbol is a declared name such as `Config` or `Config.validate`";

const pathProblem = (path: string): Option.Option<string> => {
  const segments = Str.split(path, SEPARATOR);
  return Option.liftPredicate(
    `The path ${path} has an empty, \`.\` or \`..\` segment or a trailing slash. Write the path from the repository root without a trailing slash.`,
    () =>
      pipe(
        segments,
        Arr.some((segment) => UNUSABLE_SEGMENT.test(segment)),
      ),
  );
};

const symbolProblem = (symbol: string): Option.Option<string> => {
  if (LINE_ANCHOR.test(symbol)) {
    return Option.some(
      `#${symbol} is a line number, and a line number goes stale as soon as the file changes. Name the declaration instead, such as #Config.`,
    );
  }
  return Option.liftPredicate(
    `#${symbol} is not a declared name. Write a name such as #Config or #Config.validate.`,
    () => !SYMBOL.test(symbol),
  );
};

const pathlessSymbol = (
  path: Option.Option<string>,
  symbol: Option.Option<string>,
): Option.Option<string> =>
  Option.liftPredicate(
    "A symbol needs the file that declares it. Write github:<owner>/<repo>/<path>#<symbol>.",
    () => Option.isNone(path) && Option.isSome(symbol),
  );

const githubReference = (destination: string): Result.Result<Reference, string> => {
  const found = GITHUB_REFERENCE.exec(destination);
  const path = groupOf("path")(found);
  const symbol = groupOf("symbol")(found);
  const problem = pipe(
    path,
    Option.flatMap(pathProblem),
    Option.orElse(() => pipe(symbol, Option.flatMap(symbolProblem))),
    Option.orElse(() => pathlessSymbol(path, symbol)),
  );
  if (Option.isSome(problem)) {
    return Result.fail(problem.value);
  }
  return pipe(
    Option.all({ owner: groupOf("owner")(found), repo: groupOf("repo")(found) }),
    Option.map(({ owner, repo }): Reference => ({
      kind: "github",
      owner,
      repo,
      path: Option.getOrElse(path, () => NO_PATH),
      symbol,
      ref: Option.none(),
    })),
    Result.fromOption(() => `${destination} is not a repository path. Write ${GRAMMAR}.`),
  );
};

const npmReference = (destination: string): Result.Result<Reference, string> =>
  pipe(
    groupOf("name")(NPM_REFERENCE.exec(destination)),
    Option.map((name): Reference => ({ kind: "npm", name })),
    Result.fromOption(() => `${destination} is not a package name. Write ${GRAMMAR}.`),
  );

export const parseReference = (destination: string): Result.Result<Reference, string> => {
  if (Option.contains(groupOf("scheme")(REFERENCE_SCHEME.exec(destination)), "npm")) {
    return npmReference(destination);
  }
  return githubReference(destination);
};

const githubDescription = ({ owner, repo, path, symbol, ref }: GithubReference): string => {
  const place = Option.match(Option.liftPredicate(path, Str.isNonEmpty), {
    onNone: () => `${owner}/${repo}`,
    onSome: (found) => `${owner}/${repo}/${found}`,
  });
  const fragment = Option.match(symbol, {
    onNone: () => "",
    onSome: (found) => `#${found}`,
  });
  const branch = Option.match(ref, {
    onNone: () => "",
    onSome: (found) => ` on ${found}`,
  });
  return `github:${place}${fragment}${branch}`;
};

export const describeReference = (reference: Reference): string =>
  Match.value(reference).pipe(
    Match.discriminatorsExhaustive("kind")({
      github: githubDescription,
      npm: ({ name }) => `npm:${name}`,
    }),
  );

export const branchLinkReference = (destination: string): Option.Option<Reference> => {
  const found = BRANCH_LINK.exec(destination);
  const branch = pipe(
    groupOf("ref")(found),
    Option.filter((ref) => !COMMIT.test(ref)),
  );
  return pipe(
    Option.all({ owner: groupOf("owner")(found), repo: groupOf("repo")(found), ref: branch }),
    Option.map(({ owner, repo, ref }): Reference => ({
      kind: "github",
      owner,
      repo,
      path: Option.getOrElse(groupOf("path")(found), () => NO_PATH),
      symbol: Option.none(),
      ref: Option.some(ref),
    })),
  );
};
