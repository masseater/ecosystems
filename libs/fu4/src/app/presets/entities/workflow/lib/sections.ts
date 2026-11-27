import { Record as Rec } from "effect";

import type { Env, Job } from "#/app/presets/entities/workflow/model/job-types.ts";
import type {
  Concurrency,
  Defaults,
  DefaultsRun,
  Environment,
  Permissions,
} from "#/app/presets/entities/workflow/model/types.ts";
import { optional } from "#/app/presets/shared/record/index.ts";
import type { Position, YamlNode } from "#/shared/config/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import {
  caselessSection,
  emptyableCaselessSection,
  entryRecord,
  entryText,
  section,
} from "./mapping.ts";
import { parseBool, parseExpression, parseString } from "./scalar.ts";
import { reportEmpty } from "./sequence.ts";
import { reportMissing } from "./sink.ts";
import type { Sink } from "./sink.ts";

export const parsePermissions =
  (sink: Sink) =>
  (node: YamlNode): Permissions => {
    if (node.kind === "scalar") {
      return { all: parseString(sink)(node, false), scopes: {} };
    }
    const entries = emptyableCaselessSection(sink)("permissions", node);
    return {
      scopes: entryRecord((entry) => ({ name: entry.key, value: entryText(sink)(false)(entry) }))(
        entries,
      ),
    };
  };

export const parseEnv =
  (sink: Sink) =>
  (node: YamlNode): Env => {
    if (node.kind === "scalar") {
      return {
        vars: {},
        ...optional("expression")(parseExpression(sink)(node, 'mapping value for "env" section')),
      };
    }
    return {
      vars: entryRecord((entry) => ({
        name: entry.key,
        value: parseString(sink)(entry.value, true),
      }))(caselessSection(sink)("env", node)),
    };
  };

const defaultsRun =
  (sink: Sink) =>
  (node: YamlNode): DefaultsRun => {
    const { set } = setters<DefaultsRun>();
    return foldEntries<DefaultsRun>({
      entries: section(sink)("run", node),
      initial: {},
      handlers: [
        ["shell", set("shell", entryText(sink)(false))],
        ["working-directory", set("workingDirectory", entryText(sink)(false))],
      ],
      unknown: rejecting({ sink, section: "run", expected: ["shell", "working-directory"] }),
    });
  };

export const parseDefaults =
  (sink: Sink) =>
  (node: YamlNode): Defaults => {
    const defaults = foldEntries<Defaults>({
      entries: section(sink)("defaults", node),
      initial: {},
      handlers: [
        ["run", setters<Defaults>().set("run", (entry) => defaultsRun(sink)(entry.value))],
      ],
      unknown: rejecting({ sink, section: "defaults", expected: ["run"] }),
    });
    reportMissing(sink)(defaults.run, node, '"defaults" section should have "run" section');
    return defaults;
  };

export const parseConcurrency =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Concurrency => {
    if (node.kind === "scalar") {
      return { group: parseString(sink)(node, false) };
    }
    const { set, setSome } = setters<Concurrency>();
    const concurrency = foldEntries<Concurrency>({
      entries: section(sink)("concurrency", node),
      initial: {},
      handlers: [
        ["group", set("group", entryText(sink)(false))],
        [
          "cancel-in-progress",
          setSome("cancelInProgress", (entry) => parseBool(sink)(entry.value)),
        ],
      ],
      unknown: rejecting({
        sink,
        section: "concurrency",
        expected: ["group", "cancel-in-progress"],
      }),
    });
    reportMissing(sink)(concurrency.group, at, 'group name is missing in "concurrency" section');
    return concurrency;
  };

export const parseEnvironment =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Environment => {
    if (node.kind === "scalar") {
      return { name: parseString(sink)(node, false) };
    }
    const { set, setSome } = setters<Environment>();
    const environment = foldEntries<Environment>({
      entries: section(sink)("environment", node),
      initial: {},
      handlers: [
        ["name", set("name", entryText(sink)(false))],
        ["url", set("url", entryText(sink)(false))],
        ["deployment", setSome("deployment", (entry) => parseBool(sink)(entry.value))],
      ],
      unknown: rejecting({ sink, section: "environment", expected: ["deployment", "name", "url"] }),
    });
    reportMissing(sink)(environment.name, at, 'name is missing in "environment" section');
    return environment;
  };

export const parseOutputs =
  (sink: Sink) =>
  (node: YamlNode): Job["outputs"] => {
    const outputs = entryRecord((entry) => parseString(sink)(entry.value, true))(
      caselessSection(sink)("outputs", node),
    );
    if (Rec.isEmptyRecord(outputs)) {
      reportEmpty(sink)("outputs", node);
    }
    return outputs;
  };
