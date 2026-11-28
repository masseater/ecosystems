# @r_masseater/msch

msch packages the check policy shared across masseater's repositories. It requires Vite+ and Node.js 26 or later.

```sh
vp add -D @r_masseater/msch
vp exec msch
```

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/msch": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.

| Skill                     | When to use                                 |
| ------------------------- | ------------------------------------------- |
| `msch-checks`             | Running msch and fixing what it reports     |
| `msch-publishing`         | Releasing a workspace to npm or GitHub      |
| `msch-repository-config`  | Building the root `vite.config.ts`          |
| `msch-workspace-settings` | Changing the settings of a single workspace |

The package has these entry points.

| Entry point                            | Contents                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `msch` (bin)                           | Runs every check against the repository                                   |
| `msch-changed` (bin)                   | Runs a command on the workspaces that changed since it passed, in batches |
| `msch-exits` (bin)                     | Reports upstream deviations whose exit condition is met                   |
| `msch-fix` (bin)                       | Moves versions into the catalog and rewrites prepublishOnly scripts       |
| `msch-publish` (bin)                   | Plans and publishes a workspace to npm and GitHub Releases                |
| `@r_masseater/msch/config`             | `repositoryConfig`, which builds the root `vite.config.ts`                |
| `@r_masseater/msch/workspace-settings` | `workspaceSettings`, which loads the settings of a workspace              |
| `@r_masseater/msch/lint`               | The oxlint preset and rule sets                                           |
| `@r_masseater/msch/oxlint`             | A JS plugin that reports msch findings as oxlint diagnostics              |
| `@r_masseater/msch/decision-rules`     | The decision rule plugin that the preset loads                            |

## Published to

- npm: [@r_masseater/msch](https://www.npmjs.com/package/@r_masseater/msch)
