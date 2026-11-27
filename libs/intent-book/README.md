# @r_masseater/intent-book

Builds a GitBook-style documentation site for people from the [TanStack Intent](https://tanstack.com/intent) agent skills (`SKILL.md`) that an npm package ships. The skills stay the single source, so the documentation agents read and the documentation people read cannot drift apart.

It requires Node.js 26 or later.

```sh
vp dlx @r_masseater/intent-book ./path/to/package --out book
```

## What it builds

- One page per skill and one page per file in the skill's `references/`, each at its own URL such as `/<package>/<skill>/`. The skill name is the page title, the `description` is the lead, and the Intent fields `type` and `library_version` show as chips.
- A left navigation grouped by skill `type`, a table of contents of the page on the right, previous and next links in reading order, and a search dialog.
- `requires` shows as "Read first" links. `sources` link to their files in the repository unless they are globs. Headings that start with `CRITICAL`, `HIGH`, `MEDIUM` or `LOW` under Common Mistakes carry a severity mark.
- The `SKILL.md` an agent reads, unchanged, next to each page as `/<package>/<skill>.md`.
- Light and dark themes that follow the system setting, and code highlighted with Shiki.

Links between skill files and to references become links between pages. Raw HTML in a skill is dropped.

## Use it

```text
intent-book [--out <directory>] [--base <path>] [<package>...]
```

- `<package>` is the directory of an npm package that has `skills/` and a `package.json`. It defaults to the current directory. Give several to build one site that switches between them.
- `--out` is the directory to write to. It defaults to `book`. It is replaced on every build, and a non-empty directory that this tool did not create is refused.
- `--base` is the path the site is served under, with a leading and a trailing slash. It defaults to `/`.

The output is static files. Serve it from any static host.

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/intent-book": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.

## License

[MIT](LICENSE)
