import { sortedRecord } from "@masseater.dev/lint-host/collections";
import { Array as Arr, pipe } from "effect";

import type { ExecAction, ExecRun, Input } from "#/entities/workflow/model/job-types.ts";

import { foldEntries, keep, rejecting, setters } from "./fold.ts";
import type { Handler, Handlers } from "./fold.ts";
import { caselessSection, entryText } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import type { Sink } from "./sink.ts";

const COMMON = ["id", "if", "name", "env", "continue-on-error", "timeout-minutes"];

const common = <State>(): Handlers<State> =>
  pipe(
    COMMON,
    Arr.map((key): readonly [string, Handler<State>] => [key, keep]),
  );

interface WithState {
  readonly action: ExecAction;
  readonly inputs: readonly (readonly [string, Input])[];
}

const withInput =
  (sink: Sink, docker: boolean): Handler<WithState> =>
  (state, item) => {
    if (docker && item.id === "entrypoint") {
      return { ...state, action: { ...state.action, entrypoint: entryText(sink)(false)(item) } };
    }
    if (docker && item.id === "args") {
      return { ...state, action: { ...state.action, args: entryText(sink)(true)(item) } };
    }
    const input: Input = { name: item.key, value: entryText(sink)(true)(item) };
    return { ...state, inputs: [...state.inputs, [item.id, input]] };
  };

const parseWith =
  (sink: Sink, docker: boolean): Handler<ExecAction> =>
  (action, entry) => {
    const state = foldEntries<WithState>({
      entries: caselessSection(sink)("with", entry.value),
      initial: { action, inputs: [] },
      handlers: [],
      unknown: withInput(sink, docker),
    });
    return { ...state.action, inputs: sortedRecord(state.inputs) };
  };

export const execAction =
  (sink: Sink) =>
  (entries: readonly Entry[], docker: boolean): ExecAction =>
    foldEntries<ExecAction>({
      entries,
      initial: { type: "action" },
      handlers: [
        ...common<ExecAction>(),
        ["uses", setters<ExecAction>().set("uses", entryText(sink)(false))],
        ["with", parseWith(sink, docker)],
      ],
      unknown: rejecting({
        sink,
        section: "step to execute action",
        expected: [...COMMON, "uses", "with"],
      }),
    });

const runHandler =
  (sink: Sink): Handler<ExecRun> =>
  (state, entry) => ({ ...state, run: entryText(sink)(false)(entry), runPosition: entry.key });

export const execRun =
  (sink: Sink) =>
  (entries: readonly Entry[]): ExecRun => {
    const { set } = setters<ExecRun>();
    return foldEntries<ExecRun>({
      entries,
      initial: { type: "run" },
      handlers: [
        ...common<ExecRun>(),
        ["run", runHandler(sink)],
        ["shell", set("shell", entryText(sink)(false))],
        ["working-directory", set("workingDirectory", entryText(sink)(false))],
      ],
      unknown: rejecting({
        sink,
        section: "step to run shell command",
        expected: [...COMMON, "run", "shell", "working-directory"],
      }),
    });
  };
