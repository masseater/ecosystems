# @r_masseater/vite-plus-adopt

`vpa` is a CLI that brings secret scanning with h56m, commitlint, textlint, fallow, agent skill installation and pinned command-line tools into Vite+. Write their settings and your dependency rules in `vite.config.ts`, and `vpa` reads them from there.
Running `vpa` once with no arguments runs every configured check in parallel and prints the results together.
It also bundles @arethetypeswrong/core running on TypeScript 7 alone.
For Feature-Sliced Design and other structure rules, use [wism](https://www.npmjs.com/package/@r_masseater/wism).

## Published to

- npm: [@r_masseater/vite-plus-adopt](https://www.npmjs.com/package/@r_masseater/vite-plus-adopt)

## Usage

```sh
vp add -D @r_masseater/vite-plus-adopt @r_masseater/h56m/presets
```

```ts
import { betterleaks } from "@r_masseater/h56m/presets";
import type {} from "@r_masseater/vite-plus-adopt";
import { defineConfig } from "vite-plus";

export default defineConfig({
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    banned: { "Import tests from vite-plus/test": ["vitest", "@vitest/*"] },
    peerRanges: "intersect",
  },
  h56m: {
    extend: { path: betterleaks },
    filter: 'matchesAny(finding.line, [`\\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`])',
    ignoredSecrets: ["<SHA-256 of the secret>"],
  },
  textlint: {
    ignores: ["CHANGELOG.md"],
    rules: { "preset-ja-technical-writing": true },
  },
  fallow: { production: true, rules: { "unused-files": "error" } },
  run: { tasks: { vpa: { command: "vpa", cache: false } } },
});
```

`import type {} from "@r_masseater/vite-plus-adopt"` types the keys vpa reads (`commitlint`, `dependencyRules`, `fallow`, `h56m`, `skills`, `textlint` and `tools`) on `defineConfig`.
textlint checks the Markdown files Git tracks. To check other files too, list their globs (`files`) and the settings for them in `textlint.sources`. `presets` work there as well.
`filterModules` takes textlint filter rules as modules, such as `{ comments: commentsFilter }`, and `filters: { comments: true }` turns one on, so the repository does not have to install them for textlint to find them. With `reportUnusedDirectives: true`, a `textlint-disable` comment that hides no message is an error. The check lints a file with a disable comment a second time without the filters.

Write the Git hooks like this.

```sh
# .vite-hooks/pre-commit
vpa --staged
# .vite-hooks/commit-msg
vpa --commit-msg "$1"
```

## Agent skills

List GitHub repositories and commits in `skills`, and `vpa --prepare` puts their skills in `.agents/skills/`. Skills are picked by the `name` in `SKILL.md`, and `"all"` picks every skill under `root`.

```ts
export default defineConfig({
  skills: {
    "masseater/skills": {
      commit: "40c8069607f259ab20d7cfee82f7c29b29fc65ad",
      root: "plugins/masseater-skills/skills",
      skills: "all",
    },
    "cloudflare/skills": { commit: "…", root: "skills", skills: ["cloudflare"] },
    "./docs/skills": { skills: "all" },
  },
});
```

`vpa --prepare` leaves alone the links that pnpm made into `.agents/skills/`, which `.gitignore` there lists in its `# pnpm` block, and fails when a declared skill has the same name as one of them. pnpm links the skills that approved dependencies ship, so list in `skills` only what no dependency ships.

Fetched skills are stored read-only in `~/.cache/vpa/skills/` (under `XDG_CACHE_HOME`, or `LOCALAPPDATA` on Windows), and `.agents/skills/` points to them with symbolic links (junctions on Windows). A commit is fetched once per machine and shared by every worktree. Private repositories are fetched with `GITHUB_TOKEN`.

A key starting with `./` is a folder in this repository. It takes no commit and points directly to the folders under it that contain `SKILL.md`.

Put `vpa --prepare` in `prepare`. To let Renovate update the commits and the tool versions, extend this preset in `renovate.json`.

```json
{ "extends": ["github>masseater/ecosystems//libs/vite-plus-adopt/renovate"] }
```

## Command-line tools

List release assets in `tools`, and `vpa --prepare` downloads them, checks their sha256 and links their binaries into `node_modules/.bin`, where `vp run` and `vp exec` find them. This replaces mise for tools that ship as archives.

```ts
export default defineConfig({
  tools: {
    "open-telemetry/weaver": {
      version: "0.28.0",
      assets: {
        "linux-x64": "weaver-x86_64-unknown-linux-gnu.tar.xz",
        "darwin-arm64": "weaver-aarch64-apple-darwin.tar.xz",
        "win32-x64": "weaver-x86_64-pc-windows-msvc.zip",
      },
    },
    "open-telemetry/opentelemetry-collector-releases": {
      version: "0.166.0",
      bin: ["otelcol"],
      assets: { "linux-x64": "otelcol_{version}_linux_amd64.tar.gz" },
    },
    dotnet: {
      version: "11.0.100",
      base: "https://builds.dotnet.microsoft.com/dotnet/Sdk/{version}",
      assets: { "linux-x64": "dotnet-sdk-{version}-linux-x64.tar.gz" },
    },
  },
});
```

- The key is `owner/repo` of the GitHub release, which is downloaded from `https://github.com/<owner>/<repo>/releases/download/v<version>/<asset>`. Any other key needs `base`, the URL that holds the assets. `{version}` in `base` and in an asset name is replaced by `version`.
- `assets` maps a platform (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win32-x64`) to an asset name. A tool with no asset for the current platform is skipped.
- `bin` lists the executables to link. It defaults to the repository name. Windows gets `.cmd` launchers, because linking an `.exe` there needs the symbolic link privilege. Archives are unpacked with `tar`, which is bsdtar on Windows and reads `.zip` and `.tar.xz` too.
- `vpa-lock.json` next to `vite.config.ts` pins the sha256 of each asset by its URL. A URL without an entry is recorded when it is first downloaded, and a download that no longer matches its entry fails. Commit the file.
- Tools are stored in `~/.cache/vpa/tools/`, keyed by version, platform and checksum, and shared by every worktree. Set `VPA_TOOLS=false` to skip them, for a job that needs none.
- A `tools` section in the `vite.config.ts` of a workspace works with `vpa --prepare` run in that workspace. It links into that workspace's `node_modules/.bin`.

The Renovate preset updates `version` of each GitHub key and of `dotnet`. A new version has no entry in `vpa-lock.json` yet, so `vpa --prepare` records it.

## Replacement for @arethetypeswrong/core

`@r_masseater/vite-plus-adopt/attw` provides the same API as [@arethetypeswrong/core][attw] 0.18.5, on TypeScript 7.1 alone.
Pass it to `pack.attw.module`, and the same checks run without installing `@arethetypeswrong/core`.

```ts
import * as attw from "@r_masseater/vite-plus-adopt/attw";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    attw: { module: attw, profile: "esm-only", level: "error" },
  },
});
```

[attw]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/core

## License

MIT. The licenses of the original packages bundled in `dist/attw.mjs` are in `THIRD-PARTY-NOTICES`.
