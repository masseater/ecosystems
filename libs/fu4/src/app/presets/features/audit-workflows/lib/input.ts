import { baseName } from "@masseater.dev/path-kit";
import { Option, Result, pipe } from "effect";

import type { AuditInput } from "#/app/presets/features/audit-workflows/model/input.ts";
import { documentOf } from "#/app/presets/shared/yamlpath/index.ts";
import type { Document } from "#/app/presets/shared/yamlpath/index.ts";
import type { InputKind, Source, YamlNode } from "#/shared/config/index.ts";

import { decodeAction } from "./action-decode.ts";
import { decodeDependabot } from "./dependabot-decode.ts";
import { decodePreCommitConfig, decodePreCommitHooks } from "./pre-commit-decode.ts";
import { decodeWorkflow } from "./workflow-decode.ts";

const HOOKS = ".pre-commit-hooks.yaml";
const EMPTY = (): string => "empty input";

const cache = new WeakMap<Source, Option.Option<AuditInput>>();

interface Base {
  readonly filename: string;
  readonly path: string;
  readonly source: Source;
  readonly document: Document;
}

type Build = (base: Base) => (node: YamlNode) => Result.Result<AuditInput, string>;

const preCommit: Build = (base) => (node) => {
  if (base.filename === HOOKS) {
    return Result.map(decodePreCommitHooks(node), (model): AuditInput => ({
      ...base,
      kind: "pre-commit-hooks",
      model,
    }));
  }
  return Result.map(decodePreCommitConfig(node), (model): AuditInput => ({
    ...base,
    kind: "pre-commit-config",
    model,
  }));
};

const BUILDERS: Readonly<Record<InputKind, Build>> = {
  workflow: (base) => (node) =>
    Result.map(decodeWorkflow(node), (model): AuditInput => ({ ...base, kind: "workflow", model })),
  action: (base) => (node) =>
    Result.map(decodeAction(node), (model): AuditInput => ({ ...base, kind: "action", model })),
  dependabot: (base) => (node) =>
    Result.map(decodeDependabot(node), (model): AuditInput => ({
      ...base,
      kind: "dependabot",
      model,
    })),
  "pre-commit": preCommit,
};

const decoded = (
  kind: InputKind,
  path: string,
  source: Source,
): Result.Result<AuditInput, string> =>
  Result.flatMap(documentOf(source), (document) => {
    const build = BUILDERS[kind]({ filename: baseName(path), path, source, document });
    return pipe(Option.fromNullishOr(source.yaml), Result.fromOption(EMPTY), Result.flatMap(build));
  });

export const inputOf =
  (kind: InputKind) =>
  (path: string) =>
  (source: Source): Option.Option<AuditInput> =>
    cache.getOrInsertComputed(source, () => Result.getSuccess(decoded(kind, path, source)));
