# ecosystems

Follow `masseater-style`, a skill in masseater/skills that says which skills to load in each situation. `vp install` puts the skills in `.agents/skills/`.

Each workspace has its own AGENTS.md describing it and the rules that apply only there. Read it before changing that workspace.

This repository holds the toolchain that masseater publishes to npm under `@r_masseater/*`: the repository checks, the linters and their presets, the fumx parser, and the libraries they need. masseater/masseater.dev, masseater/personal-space, masseater/mirucord and masseater/skills use it only through npm, never through a link to this workspace.

## Tech stack

The base stack is TypeScript 7, Effect and Vite+.

## Commands

- `vp run verify` runs every check in this repository. The pre-push hook runs the same checks.
- To run one test, run `vp test run <file>` in that package's directory.
- To publish, dispatch the `publish` workflow on main with the workspace directory, such as a directory under `libs/`. Bump the version by hand in the pull request first.

## Rules

- Build every check of the repository, such as lint rules and convention checks, into msch. Do not create checks anywhere else.
- Do not write private repository names in this repository. Refer to a private repository by its repository ID.
- Do not write the owner's email address in this repository.
- Do not put copyrighted works such as songs or source videos in the repository.
- Every deviation from an upstream package is temporary. Put it only in the root `pnpm-workspace.yaml` (`overrides`, `patchedDependencies`, `packageExtensions`) or the root `Cargo.toml` (`[patch]`), and end its line with `# exit: <condition>` that msch-exits can check.
- Nothing here may depend on masseater/masseater.dev. msch keeps its own copy of that repository's plugin marketplace in `libs/msch/src/shared/config/masseater-marketplace.json`; change it together with `.claude-plugin/marketplace.json` there.
- Keep Cloudflare out of this repository. CI uses only the credential broker's remote cache grant.
