import { Array as Arr, Config, Effect, Option, Schema, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { HttpClient, HttpClientResponse } from "effect/http";

const ATTESTATIONS = "https://registry.npmjs.org/-/npm/v1/attestations/";
const SLSA = /slsa\.dev\/provenance/u;

const Digest = Schema.Struct({ gitCommit: Schema.String });
const Dependency = Schema.Struct({ uri: Schema.String, digest: Digest });
const BuildDefinition = Schema.Struct({ resolvedDependencies: Schema.Array(Dependency) });
const Predicate = Schema.Struct({ buildDefinition: BuildDefinition });
const Statement = Schema.fromJsonString(Schema.Struct({ predicate: Predicate }));

const Envelope = Schema.Struct({ payload: Schema.String });
const Bundle = Schema.Struct({ dsseEnvelope: Envelope });
const Attestation = Schema.Struct({ predicateType: Schema.String, bundle: Bundle });
const Attestations = Schema.Struct({ attestations: Schema.Array(Attestation) });

/** @internal */
export interface Version {
  readonly name: string;
  readonly version: string;
}

/** @internal */
export const commitOf =
  (repository: string) =>
  (payload: string): Effect.Effect<Option.Option<string>> =>
    pipe(
      Base64.decodeString(payload),
      Effect.fromResult,
      Effect.flatMap(Schema.decodeEffect(Statement)),
      Effect.map(({ predicate }) =>
        pipe(
          Arr.head(predicate.buildDefinition.resolvedDependencies),
          Option.filter(({ uri }) => Str.includes(`github.com/${repository}@`)(uri)),
          Option.map(({ digest }) => digest.gitCommit),
        ),
      ),
      Effect.orElseSucceed(() => Option.none<string>()),
    );

/** @internal */
export const provenanceCommit = Effect.fn("publish.provenanceCommit")(function* provenanceCommit({
  name,
  version,
}: Version) {
  const client = yield* HttpClient.HttpClient;
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const url = `${ATTESTATIONS}${Str.replace("/", "%2f")(name)}@${version}`;
  const found = yield* HttpClient.filterStatusOk(client)
    .get(url)
    .pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Attestations)),
      Effect.map(({ attestations }) =>
        Arr.findFirst(attestations, ({ predicateType }) => SLSA.test(predicateType)),
      ),
      Effect.orElseSucceed(() => Option.none<(typeof Attestations.Type.attestations)[number]>()),
    );
  if (Option.isNone(found)) {
    return Option.none<string>();
  }
  return yield* commitOf(repository)(found.value.bundle.dsseEnvelope.payload);
});
