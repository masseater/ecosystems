# @r_masseater/github-workflow

This workspace holds the parts that GitHub Actions steps written with Effect share: calls to the GitHub API of the repository the workflow runs in, step outputs, warnings and errors, and running commands.

- Assume Node.js 26 or later and Effect 4. Add no branches for other runtimes.
- Keep `effect` a peer dependency so the step and this package share one copy of Effect.
- Read the repository and the token from `GITHUB_REPOSITORY`, `GH_TOKEN` and `GITHUB_TOKEN`. Do not take them as arguments.
