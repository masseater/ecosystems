import { checkBannedTool, patternsBy, spawnPattern } from "./banned-tool.ts";
import type { BannedTool } from "./banned-tool.ts";

const PYTHON_FILE =
  /(?:\.(?:py|pyi|pyw|pyx|ipynb)|(?:^|\/)(?:pyproject\.toml|uv\.lock|uv\.toml|poetry\.lock|Pipfile|Pipfile\.lock|setup\.cfg|tox\.ini|pytest\.ini|\.python-version|requirements[^/]*\.txt))$/u;

const SPAWN_PATTERNS: readonly RegExp[] = [
  spawnPattern(String.raw`python[\d.]*|pip3?|pipx|uvx?|poetry`),
];

const COMMAND_PATTERNS: readonly RegExp[] = [
  /(?<![\w./@-])python[\d.]*[ \t]+(?:[-"'$./]|\S+\.py\b)/gu,
  /(?<![\w./@-])pip3?[ \t]+(?:install|uninstall|download|freeze|wheel|compile|sync)\b/gu,
  /(?<![\w./@-])pipx[ \t]+(?:run|install|inject|upgrade)\b/gu,
  /(?<![\w./@-])uvx[ \t]+[^\s=:,;)|&]/gu,
  /(?<![\w./@-])uv[ \t]+(?:run|sync|lock|pip|tool|venv|add|remove|python|export|build|publish|init|tree|cache|self)\b/gu,
  /(?<![\w./@-])poetry[ \t]+(?:run|install|add|lock|build|publish|shell|export)\b/gu,
  ...SPAWN_PATTERNS,
  /\buses:\s*["']?(?:actions\/setup-python|astral-sh\/setup-uv|astral-sh\/ruff-action|pypa\/[\w.-]+|snok\/install-poetry|abatilo\/actions-poetry|conda-incubator\/setup-miniconda|mamba-org\/setup-micromamba|pdm-project\/setup-pdm)\b/gu,
];

const TOOL_PATTERNS: readonly RegExp[] = [
  /^[ \t]*["']?(?:python|uv|pipx|poetry|ruff|pdm|hatch|pipx:[^"'\s=]+)["']?[ \t]*(?:=|[ \t]+\S)/gmu,
];

const PYTHON: BannedTool = {
  fileRule: "python-file",
  commandRule: "python-command",
  isFile: ({ name }) => PYTHON_FILE.test(name),
  patternsFor: patternsBy({
    spawn: SPAWN_PATTERNS,
    command: COMMAND_PATTERNS,
    toolVersions: TOOL_PATTERNS,
  }),
  fileMessage: () =>
    "Python is not used in this repository. Replace this file with TypeScript or Rust.",
  commandMessage: (command) =>
    `Python is not used in this repository. Remove \`${command}\` and do the work in TypeScript or Rust.`,
};

/** @internal */
export const checkPython = (root: string): ReturnType<typeof checkBannedTool> =>
  checkBannedTool(root, PYTHON);
