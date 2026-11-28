import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Reader } from "./comment-readers.ts";

const SHEBANG = "#!";

const READERS: readonly (readonly [RegExp, Reader])[] = [
  [/\.(?:[cm]?jsx?)$/u, "javascript"],
  [/\.(?:[cm]?ts)$/u, "typescript"],
  [/\.tsx$/u, "tsx"],
  [/\.rs$/u, "rust"],
  [/\.(?:cs|csx)$/u, "c-sharp"],
  [/\.(?:sh|bash|zsh|ksh)$/u, "bash"],
  [/(?:^|\/)\.(?:vite-hooks|husky|githooks)\/[^./][^/]*$/u, "bash"],
  [/\.(?:ps1|psm1|psd1)$/u, "powershell"],
  [/\.(?:c|h|cc|cpp|cxx|hpp|hh|m|mm|glsl|frag|vert|comp|wgsl|hlsl|metal)$/u, "cpp"],
  [/\.(?:css|pcss)$/u, "css"],
  [/\.(?:html?|vue|svelte|astro)$/u, "html"],
  [/\.(?:xml|xaml|plist|resx|props|targets|[a-z]+proj|manifest|nuspec)$/u, "xml"],
  [/\.ya?ml$/u, "yaml"],
  [/\.toml$/u, "toml"],
  [/\.sql$/u, "sql"],
  [/(?:^|\/)(?:Dockerfile|Containerfile)(?:\.[^/]+)?$|\.dockerfile$/u, "dockerfile"],
];

const SHEBANG_READERS: readonly (readonly [RegExp, Reader])[] = [
  [/^#!.*\b(?:ba|z|k|da)?sh\b/u, "bash"],
  [/^#!.*\b(?:node|bun|deno|tsx)\b/u, "javascript"],
  [/^#!.*\bpwsh\b/u, "powershell"],
];

const shebangReader = (source: string): Option.Option<readonly [RegExp, Reader]> => {
  if (!Str.startsWith(SHEBANG)(source)) {
    return Option.none();
  }
  return pipe(
    SHEBANG_READERS,
    Arr.findFirst(([pattern]) => pattern.test(source)),
  );
};

export const readerOf =
  (name: string) =>
  (source: string): Option.Option<Reader> =>
    pipe(
      READERS,
      Arr.findFirst(([pattern]) => pattern.test(name)),
      Option.orElse(() => shebangReader(source)),
      Option.map(([, reader]) => reader),
    );
