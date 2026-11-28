import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { STRING, loose, strict } from "#/app/presets/entities/expression/index.ts";
import type { ObjectType } from "#/app/presets/entities/expression/index.ts";
import type { Workflow, WorkflowCallEvent } from "#/app/presets/entities/workflow/index.ts";

import type { ExprEnv } from "./env.ts";
import { checkEvents, withEventVars } from "./events.ts";
import type { EventVars } from "./events.ts";
import { jobInfos } from "./outputs.ts";
import type { JobInfo } from "./outputs.ts";
import { checkConcurrency, checkDefaults, checkEnv } from "./sections.ts";
import { checkString } from "./strings.ts";

export const checkWorkflow =
  (env: ExprEnv) =>
  (workflow: Workflow): EventVars => {
    checkString(env)(workflow.name, "");
    const vars = checkEvents(env)(workflow.on ?? []);
    const after = withEventVars(env)(vars);
    checkString(after)(workflow.runName, "run-name");
    checkEnv(after)(workflow.env, "env");
    checkDefaults(after)(workflow.defaults, "");
    checkConcurrency(after)(workflow.concurrency, "concurrency");
    return vars;
  };

const callEventOf = (workflow: Workflow): Option.Option<WorkflowCallEvent> =>
  pipe(
    workflow.on ?? [],
    Arr.findFirst((event): event is WorkflowCallEvent => event.type === "workflow_call"),
  );

const outputsType = (info: JobInfo): ObjectType => {
  if (info.type === "call") {
    return loose();
  }
  return strict(Rec.fromIterableWith(info.outputs, (name) => [name, STRING]));
};

const jobsType = (infos: Readonly<Record<string, JobInfo>>): ObjectType =>
  strict(
    pipe(
      infos,
      Rec.map((info) => strict({ outputs: outputsType(info) })),
    ),
  );

export const callOutputsJobs = (workflow: Workflow): Option.Option<ObjectType> =>
  pipe(
    callEventOf(workflow),
    Option.filter((call) => !Rec.isEmptyRecord(call.outputs)),
    Option.map(() => jobInfos(workflow)),
    Option.filter((infos) => !Rec.isEmptyRecord(infos)),
    Option.map(jobsType),
  );

export const checkCallOutputs =
  (env: ExprEnv) =>
  (workflow: Workflow): void => {
    for (const call of Option.toArray(callEventOf(workflow))) {
      for (const output of Rec.values(call.outputs)) {
        checkString(env)(output.value, "on.workflow_call.outputs.<output_id>.value");
      }
    }
  };
