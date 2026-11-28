import { Option, Predicate } from "effect";

import type {
  Container,
  Credentials,
  Services,
} from "#/app/presets/entities/workflow/model/job-types.ts";
import { quote } from "#/app/presets/shared/text/index.ts";
import type { Position, YamlNode } from "#/shared/config/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import { caselessSection, entryRecord, entryText, section } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { mayParseExpression, parseString } from "./scalar.ts";
import { parseEnv } from "./sections.ts";
import { parseStringSequence } from "./sequence.ts";
import { reportMissing } from "./sink.ts";
import type { Sink } from "./sink.ts";

const parseCredentials =
  (sink: Sink) =>
  (entry: Entry): Option.Option<Credentials> => {
    const expression = mayParseExpression(entry.value);
    if (Option.isSome(expression)) {
      return Option.some({ expression: expression.value });
    }
    const { set } = setters<Credentials>();
    const credentials = foldEntries<Credentials>({
      entries: section(sink)("credentials", entry.value),
      initial: {},
      handlers: [
        ["username", set("username", entryText(sink)(false))],
        ["password", set("password", entryText(sink)(false))],
      ],
      unknown: rejecting({ sink, section: "credentials", expected: ["username", "password"] }),
    });
    if (
      Predicate.isUndefined(credentials.username) ||
      Predicate.isUndefined(credentials.password)
    ) {
      sink.error(
        entry.key,
        'both "username" and "password" must be specified in "credentials" section',
      );
      return Option.none();
    }
    return Option.some(credentials);
  };

const strings =
  (sink: Sink, name: string) =>
  (entry: Entry): Container["ports"] =>
    parseStringSequence(sink)({
      section: name,
      node: entry.value,
      allowEmpty: true,
      allowElementEmpty: false,
    });

const CONTAINER_KEYS = ["image", "credentials", "env", "ports", "volumes", "options"];

export const parseContainer =
  (sink: Sink) =>
  (name: string, at: Position, node: YamlNode): Container => {
    if (node.kind === "scalar") {
      return { ports: [], volumes: [], image: parseString(sink)(node, false) };
    }
    const { set, setSome } = setters<Container>();
    const container = foldEntries<Container>({
      entries: section(sink)(name, node),
      initial: { ports: [], volumes: [] },
      handlers: [
        ["image", set("image", entryText(sink)(false))],
        ["credentials", setSome("credentials", parseCredentials(sink))],
        ["env", set("env", (entry) => parseEnv(sink)(entry.value))],
        ["ports", set("ports", strings(sink, "ports"))],
        ["volumes", set("volumes", strings(sink, "volumes"))],
        ["options", set("options", entryText(sink)(true))],
      ],
      unknown: rejecting({ sink, section: name, expected: CONTAINER_KEYS }),
    });
    reportMissing(sink)(container.image, at, `"image" is missing in ${quote(name)} section`);
    return container;
  };

export const parseServices =
  (sink: Sink) =>
  (node: YamlNode): Services => {
    const expression = mayParseExpression(node);
    if (Option.isSome(expression)) {
      return { value: {}, expression: expression.value };
    }
    const entries = caselessSection(sink)("services", node);
    return {
      value: entryRecord((entry) => ({
        name: entry.key,
        container: parseContainer(sink)("services", entry.key, entry.value),
      }))(entries),
    };
  };
