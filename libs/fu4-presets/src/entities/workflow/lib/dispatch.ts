import type { Position, YamlNode } from "@r_masseater/fu4";
import { Option, Record as Rec } from "effect";

import type {
  DispatchInput,
  DispatchInputType,
  ImageVersionEvent,
  WorkflowDispatchEvent,
} from "#/entities/workflow/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import type { Handler } from "./fold.ts";
import {
  emptyableCaselessSection,
  emptyableSection,
  entryRecord,
  entryText,
  parseMapping,
} from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { checkString, parseBool } from "./scalar.ts";
import { parseStringSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

const DISPATCH_TYPES: Readonly<Record<string, DispatchInputType>> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  choice: "choice",
  environment: "environment",
};

const dispatchType =
  (sink: Sink): Handler<DispatchInput> =>
  (state, entry) => {
    const node = entry.value;
    if (!checkString(sink)(node, false)) {
      return state;
    }
    return Option.match(Rec.get(DISPATCH_TYPES, node.value), {
      onSome: (kind): DispatchInput => ({ ...state, kind }),
      onNone: () => {
        sink.error(
          node,
          `input type of workflow_dispatch event must be one of "string", "number", "boolean", "choice", "environment" but got ${quote(node.value)}`,
        );
        return state;
      },
    });
  };

const strings =
  (sink: Sink, section: string) =>
  (entry: Entry): readonly Text[] =>
    parseStringSequence(sink)({
      section,
      node: entry.value,
      allowEmpty: false,
      allowElementEmpty: false,
    });

const dispatchInput =
  (sink: Sink) =>
  (input: Entry): DispatchInput => {
    const { set, setSome } = setters<DispatchInput>();
    return foldEntries<DispatchInput>({
      entries: parseMapping(sink)({
        place: "input settings of workflow_dispatch event",
        node: input.value,
        allowEmpty: true,
        caseSensitive: true,
      }),
      initial: { name: input.key, kind: "none", options: [] },
      handlers: [
        ["description", set("description", entryText(sink)(true))],
        ["required", setSome("required", (entry) => parseBool(sink)(entry.value))],
        ["default", set("default", entryText(sink)(true))],
        ["type", dispatchType(sink)],
        ["options", set("options", strings(sink, "options"))],
      ],
      unknown: rejecting({
        sink,
        section: "inputs",
        expected: ["description", "required", "default"],
      }),
    });
  };

export const emptyDispatch = (at: Position): WorkflowDispatchEvent => ({
  type: "workflow_dispatch",
  inputs: {},
  line: at.line,
  column: at.column,
});

export const parseWorkflowDispatch =
  (sink: Sink) =>
  (at: Position, node: YamlNode): WorkflowDispatchEvent =>
    foldEntries<WorkflowDispatchEvent>({
      entries: emptyableSection(sink)("workflow_dispatch", node),
      initial: emptyDispatch(at),
      handlers: [
        [
          "inputs",
          setters<WorkflowDispatchEvent>().set("inputs", (entry) =>
            entryRecord(dispatchInput(sink))(emptyableCaselessSection(sink)("inputs", entry.value)),
          ),
        ],
      ],
      unknown: rejecting({ sink, section: "workflow_dispatch", expected: ["inputs"] }),
    });

export const EMPTY_IMAGE_VERSION: ImageVersionEvent = {
  type: "image_version",
  names: [],
  versions: [],
};

export const parseImageVersion =
  (sink: Sink) =>
  (node: YamlNode): ImageVersionEvent => {
    const { set } = setters<ImageVersionEvent>();
    return foldEntries<ImageVersionEvent>({
      entries: emptyableSection(sink)("image_version", node),
      initial: EMPTY_IMAGE_VERSION,
      handlers: [
        ["names", set("names", strings(sink, "names"))],
        ["versions", set("versions", strings(sink, "versions"))],
      ],
      unknown: rejecting({ sink, section: "image_version", expected: ["names", "versions"] }),
    });
  };
