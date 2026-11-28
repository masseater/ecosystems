import { Array as Arr, Effect, HashSet, Match, Option, Schema, String as Str, pipe } from "effect";
import { HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { githubToken, jsonLookup, publicLookup, sent } from "#/shared/lib/lookup.ts";
import type { Lookup } from "#/shared/lib/lookup.ts";

import { declaredSymbols, grammarOf, supportedExtensions } from "./declared-symbols.ts";
import { NO_PATH } from "./reference.ts";
import type { GithubReference, NpmReference, Reference } from "./reference.ts";

const GITHUB = "https://api.github.com/repos/";
const NPM = "https://registry.npmjs.org/";
const RAW = "application/vnd.github.raw+json";
const ABBREVIATED = "application/vnd.npm.install-v1+json";
const NOT_FOUND = 404;
const MULTIPLE_CHOICES = 300;
const SEPARATOR = "/";

/** @internal */
export type Outcome =
  | { readonly kind: "found" }
  | { readonly kind: "broken"; readonly reason: string }
  | { readonly kind: "unchecked"; readonly reason: string };

const found: Outcome = { kind: "found" };
const broken = (reason: string): Outcome => ({ kind: "broken", reason });
const unchecked = (reason: string): Outcome => ({ kind: "unchecked", reason });

const Repository = Schema.Struct({
  full_name: Schema.String,
  archived: Schema.Boolean,
  default_branch: Schema.String,
});
const Version = Schema.Struct({ deprecated: Schema.optional(Schema.String) });
const Packument = Schema.Struct({
  "dist-tags": Schema.Struct({ latest: Schema.String }),
  versions: Schema.Record(Schema.String, Version),
});

type Failure = HttpClientError.HttpClientError | Schema.SchemaError;
type Lookups = Effect.Effect<Outcome, Failure, HttpClient.HttpClient>;

const answered = (
  lookup: Lookup,
  missing: string,
  next: (response: HttpClientResponse.HttpClientResponse) => Lookups,
): Lookups =>
  Effect.flatMap(sent(lookup), (response) => {
    if (response.status === NOT_FOUND) {
      return Effect.succeed(broken(missing));
    }
    if (response.status >= MULTIPLE_CHOICES) {
      return Effect.succeed(unchecked(`the lookup answered HTTP ${String(response.status)}`));
    }
    return next(response);
  });

const encodedPath = (path: string): string =>
  pipe(Str.split(path, SEPARATOR), Arr.map(encodeURIComponent), Arr.join(SEPARATOR));

const repositoryOutcome = (
  { owner, repo }: GithubReference,
  repository: typeof Repository.Type,
): Outcome => {
  if (Str.toLowerCase(repository.full_name) !== Str.toLowerCase(`${owner}/${repo}`)) {
    return broken(`${owner}/${repo} has moved to ${repository.full_name}. Point at the new name.`);
  }
  if (repository.archived) {
    return broken(
      `${owner}/${repo} is archived. Point at the repository that replaced it, or drop the pointer.`,
    );
  }
  return found;
};

const symbolOutcome = Effect.fn("symbolOutcome")(function* symbolOutcome(
  { path }: GithubReference,
  symbol: string,
  source: string,
) {
  const grammar = grammarOf(path);
  if (Option.isNone(grammar)) {
    return broken(
      `${path} is not a file msch can read symbols from. Drop #${symbol}, or point at a file with one of the extensions ${Arr.join(supportedExtensions, ", ")}.`,
    );
  }
  const declared = yield* Effect.option(declaredSymbols(grammar.value, source));
  return Option.match(declared, {
    onNone: () => unchecked(`the ${grammar.value} grammar could not read ${path}`),
    onSome: (names) => {
      if (HashSet.has(names, symbol)) {
        return found;
      }
      return broken(`${path} declares no ${symbol}. Fix the name or point at where it lives now.`);
    },
  });
});

const pathOutcome = (
  reference: GithubReference,
  defaultBranch: string,
  token: Option.Option<string>,
): Lookups => {
  const branch = Option.getOrElse(reference.ref, () => defaultBranch);
  const url = `${GITHUB}${reference.owner}/${reference.repo}/contents/${encodedPath(reference.path)}?ref=${encodeURIComponent(branch)}`;
  const missing = `${reference.path} does not exist on ${branch} of ${reference.owner}/${reference.repo}. Point at where it lives now.`;
  return Option.match(reference.symbol, {
    onNone: () => answered(jsonLookup({ url, token }), missing, () => Effect.succeed(found)),
    onSome: (symbol) =>
      answered({ url, token, accept: RAW }, missing, (response) =>
        response.text.pipe(Effect.flatMap((source) => symbolOutcome(reference, symbol, source))),
      ),
  });
};

const repositoryStep =
  (reference: GithubReference, token: Option.Option<string>) =>
  (response: HttpClientResponse.HttpClientResponse): Lookups =>
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Repository)(response), (repository) => {
      const checked = repositoryOutcome(reference, repository);
      if (checked.kind !== "found" || reference.path === NO_PATH) {
        return Effect.succeed(checked);
      }
      return pathOutcome(reference, repository.default_branch, token);
    });

const githubOutcome = Effect.fn("githubOutcome")(function* githubOutcome(
  reference: GithubReference,
) {
  const token = yield* githubToken;
  const lookup = jsonLookup({ url: `${GITHUB}${reference.owner}/${reference.repo}`, token });
  const missing = `${reference.owner}/${reference.repo} does not exist, or the token in GH_TOKEN cannot read it.`;
  return yield* answered(lookup, missing, repositoryStep(reference, token));
});

const deprecation = ({
  "dist-tags": tags,
  versions,
}: typeof Packument.Type): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(versions[tags.latest]),
    Option.flatMap(({ deprecated }) => Option.fromNullishOr(deprecated)),
  );

const npmOutcome = ({ name }: NpmReference): Lookups =>
  answered(
    {
      ...publicLookup(`${NPM}${Str.replace("/", "%2f")(name)}`),
      accept: ABBREVIATED,
    },
    `${name} is not published on npm.`,
    (response) =>
      Effect.map(HttpClientResponse.schemaBodyJson(Packument)(response), (packument) =>
        Option.match(deprecation(packument), {
          onNone: () => found,
          onSome: (message) => broken(`${name} is deprecated: ${message}`),
        }),
      ),
  );

/** @internal */
export const resolveReference = (
  reference: Reference,
): Effect.Effect<Outcome, never, HttpClient.HttpClient> =>
  Match.value(reference).pipe(
    Match.discriminatorsExhaustive("kind")({ github: githubOutcome, npm: npmOutcome }),
    Effect.match({
      onFailure: (failure) => unchecked(`the lookup failed: ${String(failure)}`),
      onSuccess: (outcome) => outcome,
    }),
  );
