---
name: build-skill-docs-site
description: >
  Use when an npm package ships Intent-format agent skills (skills/**/SKILL.md) and people need
  documentation for the same content: intent-book builds a GitBook-style site from the skills so
  the agent documentation and the human documentation are one source.
metadata:
  type: core
  library: "@r_masseater/intent-book"
  library_version: 0.0.0
sources:
  - src/features/**
  - README.md
---

# build-skill-docs-site

The skills of a package are the documentation. `intent-book` turns them into a static site, so nothing is written twice.

## Build the site

```sh
vp dlx @r_masseater/intent-book . --out book
```

The argument is the package directory. It must contain `package.json` and `skills/<name>/SKILL.md`. Pass several directories to get one site with a package switcher.

## Serve it from a path

```sh
vp dlx @r_masseater/intent-book . --out book --base /docs/
```

`--base` has a leading and a trailing slash. Every link and asset is prefixed with it.

## Write skills that read well as pages

- Start the body with one `# Title`. It becomes the page title and is removed from the body.
- Write `description` as sentences. The first sentence is the summary on the overview.
- Put `type` in `metadata`. Pages are grouped and ordered by it: `lifecycle`, `core`, `sub-skill`, `framework`, `composition`, `security`.
- Link another skill by the relative path to its SKILL.md. The link becomes a page link.

## Common mistakes

### Pointing `--out` at a directory that holds other files

Wrong:

```sh
intent-book . --out docs
```

Correct:

```sh
intent-book . --out book
```

The output directory is deleted before each build. The tool refuses a non-empty directory it did not create, so an existing `docs/` is not overwritten, but the build fails.
