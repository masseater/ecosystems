# @r_masseater/intent-book

Builds a GitBook-style documentation site for people from the [TanStack Intent](https://tanstack.com/intent) agent skills (`SKILL.md`) that an npm package ships. The skills stay the single source, so the documentation agents read and the documentation people read cannot drift apart.

It requires Node.js 26 or later.

```sh
vp dlx @r_masseater/intent-book ./path/to/package --out book
```

## What it builds

- One page per skill and one page per other Markdown file inside the skill directory, such as `references/` or `scripts/`, each at its own URL under the package name, such as `/@scope/name/<skill>/`. The skill name is the page title, the `description` is the lead, and the Intent fields `type` and `library_version` show as chips.
- A left navigation grouped by skill `type`, a table of contents of the page on the right, previous and next links in reading order, and a search dialog.
- `requires` shows as "Read first" links. `sources` link to their files in the repository unless they are globs. Headings that start with `CRITICAL`, `HIGH`, `MEDIUM` or `LOW` under Common Mistakes carry a severity mark.
- The `SKILL.md` an agent reads, unchanged, next to each page as `/@scope/name/<skill>.md`.
- Light and dark themes that follow the system setting, and code highlighted with Shiki.

Links between those Markdown files become links between pages. Links to any other file, such as a script or an image, or to a file outside the skills such as `skills/_artifacts/`, point to that file on GitHub when `repository` is a GitHub URL; the package directory comes from `repository.directory`. Files of a nested skill belong to that skill. Raw HTML in a skill is dropped.

## Use it

```text
intent-book [--out <directory>] [--base <path>] [--no-landing] [<package>...]
```

- `<package>` is the directory of an npm package that has `skills/` and a `package.json`. It defaults to the current directory. Give several to build one site that switches between them. A directory without `skills/` is skipped when more than one is given, so a glob such as `node_modules/@scope/*` works. The tool expands a glob itself, so it also works where the shell does not expand it, such as in a task command of Vite Task. A package that several patterns reach through links, such as a workspace package linked in two `node_modules`, is built once.
- `--out` is the directory to write to. It defaults to `book`. It is replaced on every build, and a non-empty directory that this tool did not create is refused.
- `--base` is the path the site is served under, with a leading and a trailing slash. It defaults to `/`.
- `--no-landing` leaves out the `index.html` at the root, for a site that is copied into another site. The stylesheet, the script and the search index always go to `_intent-book/`, so they do not collide with the other site's files.

The output is static files. Serve it from any static host.

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/intent-book": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.

## License

[MIT](LICENSE)
