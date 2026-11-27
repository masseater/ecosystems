import type { Position, YamlNode } from "@r_masseater/fu4";
import { Option } from "effect";

import type { CallValue, Runner, Snapshot } from "#/entities/workflow/model/job-types.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import type { Handler } from "./fold.ts";
import { caselessSection, entryRecord, section } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { mayParseExpression, parseString } from "./scalar.ts";
import { parseStringOrSequence } from "./sequence.ts";
import { reportMissing } from "./sink.ts";
import type { Sink } from "./sink.ts";

const labels =
  (sink: Sink) =>
  (name: string, node: YamlNode): readonly Text[] =>
    parseStringOrSequence(sink)({
      section: name,
      node,
      allowEmpty: false,
      allowElementEmpty: false,
    });

const labelsHandler =
  (sink: Sink): Handler<Runner> =>
  (state, entry) =>
    Option.match(mayParseExpression(entry.value), {
      onSome: (expression): Runner => ({ ...state, labelsExpression: expression }),
      onNone: (): Runner => ({ ...state, labels: labels(sink)("labels", entry.value) }),
    });

const text =
  (sink: Sink) =>
  (entry: Entry): Text =>
    parseString(sink)(entry.value, false);

export const parseRunsOn =
  (sink: Sink) =>
  (node: YamlNode): Runner => {
    const expression = mayParseExpression(node);
    if (Option.isSome(expression)) {
      return { labels: [], labelsExpression: expression.value };
    }
    if (node.kind === "scalar" || node.kind === "sequence") {
      return { labels: labels(sink)("runs-on", node) };
    }
    return foldEntries<Runner>({
      entries: section(sink)("runs-on", node),
      initial: { labels: [] },
      handlers: [
        ["labels", labelsHandler(sink)],
        ["group", setters<Runner>().set("group", text(sink))],
      ],
      unknown: rejecting({ sink, section: "runs-on", expected: ["labels", "group"] }),
    });
  };

const snapshotMapping =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Snapshot => {
    const { set } = setters<Snapshot>();
    const snapshot = foldEntries<Snapshot>({
      entries: section(sink)("on", node),
      initial: {},
      handlers: [
        ["image-name", set("imageName", text(sink))],
        ["version", set("version", text(sink))],
        ["if", set("condition", text(sink))],
      ],
      unknown: rejecting({ sink, section: "snapshot", expected: ["image-name", "version", "if"] }),
    });
    reportMissing(sink)(
      snapshot.imageName,
      at,
      '"snapshot" section must have "image-name" configuration',
    );
    return snapshot;
  };

export const parseSnapshot =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Option.Option<Snapshot> => {
    if (node.kind === "scalar") {
      return Option.some({ imageName: parseString(sink)(node, false) });
    }
    if (node.kind === "mapping") {
      return Option.some(snapshotMapping(sink)(at, node));
    }
    sink.error(
      node,
      `"snapshot" section value must be string or mapping but found ${node.kind} node`,
    );
    return Option.none();
  };

export const parseCallValues =
  (sink: Sink) =>
  (name: string, node: YamlNode): Readonly<Record<string, CallValue>> =>
    entryRecord((entry): CallValue => ({
      name: entry.key,
      value: parseString(sink)(entry.value, true),
    }))(caselessSection(sink)(name, node));
