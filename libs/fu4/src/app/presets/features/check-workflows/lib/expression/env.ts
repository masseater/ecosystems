import type { Option } from "effect";

import type { ExprType, ObjectType } from "#/app/presets/entities/expression/index.ts";
import type { Fail } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import type { Position } from "#/shared/config/index.ts";

export interface Vars {
  readonly matrix: Option.Option<ObjectType>;
  readonly steps: Option.Option<ObjectType>;
  readonly needs: Option.Option<ObjectType>;
  readonly secrets: Option.Option<ObjectType>;
  readonly inputs: Option.Option<ObjectType>;
  readonly dispatchInputs: Option.Option<ObjectType>;
  readonly jobs: Option.Option<ObjectType>;
}

export interface ExprEnv {
  readonly fail: Fail;
  readonly configVars: Option.Option<readonly string[]>;
  readonly vars: () => Vars;
}

export interface Typed extends Position {
  readonly type: ExprType;
}
