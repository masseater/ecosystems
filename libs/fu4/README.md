# @r_masseater/fu4

<img src="logo.svg" alt="fu4 logo" width="256">

The engine of a GitHub Actions linter, configured from `vite.config.ts`.

fu4 parses workflows, `action.yml` files, the Dependabot config and pre-commit configs in Rust,
hands the YAML and tree-sitter trees to TypeScript rules without copying them, and runs those
rules. It ships no rules of its own. Take the official ones from
the `@r_masseater/fu4/presets` subpath: actionlint's
checks and zizmor's audits.

```sh
npm install -D @r_masseater/fu4 effect
```

```ts
import "@r_masseater/fu4/vite";
import { recommended } from "@r_masseater/fu4/presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    extends: [recommended()],
    rules: { "zizmor/stale-action-refs": "warn" },
    overrides: [
      { files: [".github/workflows/vendored-*.yml"], rules: { "actionlint/shellcheck": "off" } },
    ],
    ignores: [".github/workflows/generated-*.yml"],
  },
});
```

| Key         | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `extends`   | Configs to start from; this config's own keys come after them and win |
| `plugins`   | Rule plugins by name; a rule is then `<plugin>/<rule>`                |
| `rules`     | `"error"`, `"warn"` or `"off"` per rule, or `[severity, options]`     |
| `settings`  | Settings every rule can read, keyed by plugin                         |
| `overrides` | `files` globs with their own `rules`                                  |
| `ignores`   | Globs of files the CLI does not lint                                  |

Run `fu4` in the repository root. It lints the workflows under `.github/workflows`, the
`action.yml` files, `.github/dependabot.yml` and the pre-commit configs at the root, prints
`path:line:column: message [rule]`, and exits with 1 when it reports anything. Pass pathspecs to
lint other files. From code, `lint({ root, files, config })` returns the diagnostics as an Effect.

Write your own rules with `defineRule` and group them with `definePlugin`. A rule receives the
parsed source, can parse a `run:` script with `parseScript`, and reports positions with
`report`.

## Presets

List the presets you want in `extends`, or take both with `recommended()`. Every rule of a chosen
preset is an error. Override one in `rules`, such as `"zizmor/stale-action-refs": "warn"`.

| Preset       | Rules                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `actionlint` | `actionlint/*`: what [actionlint](https://github.com/rhysd/actionlint) reports, with its shellcheck checks |
| `zizmor`     | `zizmor/*`: the audits of [zizmor](https://github.com/zizmorcore/zizmor), with its findings and positions  |

`actionlint()` takes the options of actionlint's `actionlint.yaml`.

`zizmor()` takes these options.

| Option          | Meaning                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `concerns`      | `injection`, `supply-chain`, `references`, `credentials`, `workflow` and `config`; all by default |
| `persona`       | `regular`, `pedantic` or `auditor`, as zizmor's `--persona`                                       |
| `minSeverity`   | The lowest severity to report                                                                     |
| `minConfidence` | The lowest confidence to report                                                                   |
| `rules`         | The `rules` section of a zizmor config                                                            |
| `online`        | `false` skips the audits that query GitHub                                                        |
| `githubHost`    | The GitHub host to query, such as a GitHub Enterprise Server host; `github.com` by default        |

The audits that query GitHub read a token from `ZIZMOR_GITHUB_TOKEN`, `GH_TOKEN` or
`GITHUB_TOKEN`, in that order, and are skipped without one. They list a repository's branches and
tags through git's protocol, and list a public repository anonymously when GitHub rejects the token there.
Commits found to be reachable are remembered in
`node_modules/.cache/fu4/zizmor-reachable-commits.txt`, so later runs do not ask GitHub again.
zizmor's auto-fixes are not included.

The preset rules use only the rule API of fu4, so they need no native build of their own.

## Comparison

Measured on 2026-11-19 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/ecosystems/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/ecosystems/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

On the same files in nodejs/node, fu4 reports 74 of the 86 findings of actionlint and zizmor together and none of its own. The other 12 are actionlint 1.7.12 errors on `$/` paths in `uses:`, GitHub's syntax for an action or reusable workflow in the same repository, which actionlint does not accept yet. fu4 is slower, mostly in starting Node and loading the presets.

### masseater.dev

| Tool                | Version                              | Cold    | Warm             | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------- | ------------------------------------ | ------- | ---------------- | -------- | -------- | ------------ | --------- | ----------- |
| ghalint             | 1.6.0                                | 84 ms   | 32 ms ± 4 ms     | 16 MB    | 35       |              |           |             |
| actionlint          | 1.7.12                               | 110 ms  | 71 ms ± 3 ms     | 23 MB    | 0        |              |           |             |
| zizmor              | 1.32.0                               | 140 ms  | 105 ms ± 16 ms   | 31 MB    | 0        |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 238 ms  | 170 ms ± 9 ms    | 31 MB    | 0        | 0            | 0         | 0           |
| poutine             | 1.1.6                                | 672 ms  | 429 ms ± 14 ms   | 55 MB    | 39       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 1.75 s  | 1.50 s ± 41 ms   | 463 MB   | 0        |              |           |             |
| sisakulint          | 0.3.8                                | 10.11 s | 10.14 s ± 370 ms | 51 MB    | 46       |              |           |             |

- fu4: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint + zizmor: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint: Workflows only, with shellcheck
- zizmor: Workflows, action.yml files and the Dependabot config, offline, regular persona
- poutine: Workflows and actions, default rules
- ghalint: Workflows and actions, default policies
- sisakulint: Workflows, default rules

### nodejs/node

| Tool                | Version                              | Cold   | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------- | ------------------------------------ | ------ | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| ghalint             | 1.6.0                                | 202 ms | 97 ms ± 5 ms    | 18 MB    | 92       |              |           |             |
| zizmor              | 1.32.0                               | 240 ms | 188 ms ± 15 ms  | 35 MB    | 18       |              |           |             |
| actionlint          | 1.7.12                               | 374 ms | 347 ms ± 11 ms  | 28 MB    | 68       |              |           |             |
| actionlint + zizmor | 1.7.12 + 1.32.0                      | 609 ms | 544 ms ± 6 ms   | 36 MB    | 86       | 74           | 0         | 12          |
| poutine             | 1.1.6                                | 1.22 s | 778 ms ± 17 ms  | 55 MB    | 43       |              |           |             |
| **fu4**             | workspace, fu4-presets recommended() | 3.12 s | 2.66 s ± 101 ms | 546 MB   | 74       |              |           |             |
| sisakulint          | 0.3.8                                | 8.16 s | 8.25 s ± 732 ms | 30 MB    | 31       |              |           |             |

- fu4: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint + zizmor: Workflows, action.yml files and the Dependabot config, offline, recommended or default rules
- actionlint: Workflows only, with shellcheck
- zizmor: Workflows, action.yml files and the Dependabot config, offline, regular persona
- poutine: Workflows and actions, default rules
- ghalint: Workflows and actions, default policies
- sisakulint: Workflows, default rules

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/fu4": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.
