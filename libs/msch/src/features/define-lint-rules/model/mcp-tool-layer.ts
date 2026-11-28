import { segments, toPosix } from "@masseater.dev/path-kit";
import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";

const SOURCE = "/src/";
const TOOL_LAYERS: readonly string[] = ["features", "shared"];
const TEST_FILE = /\.test(?:\.support)?\.[cm]?[jt]sx?$/u;
const METHOD = "registerTool";

const MESSAGE =
  "Register an MCP tool in the features slice of the operation it performs. A tool is one operation, so app/ only composes the slices' register functions and entities/ only holds the data they share.";

const layerIn = (path: string): Option.Option<string> =>
  pipe(
    Str.lastIndexOf(SOURCE)(path),
    Option.map((index) => Arr.headNonEmpty(segments(Str.slice(index + SOURCE.length)(path)))),
  );

const layerOf = (filename: string): Option.Option<string> => layerIn(toPosix(filename));

const outsideToolLayers = (filename: string): boolean =>
  !TEST_FILE.test(filename) &&
  Option.exists(layerOf(filename), (layer) => !Arr.contains(TOOL_LAYERS, layer));

export const mcpToolLayer: Rule = {
  meta: { type: "problem" },
  create: (context) => {
    if (!outsideToolLayers(context.filename)) {
      return {};
    }
    return {
      CallExpression: (node): void => {
        const { callee } = node;
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === METHOD
        ) {
          context.report({ node: callee.property, message: MESSAGE });
        }
      },
    };
  },
};
