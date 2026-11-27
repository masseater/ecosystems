# @r_masseater/intent-book

This workspace builds a static documentation site for people from the Intent-format agent skills of npm packages. The skills are the only source. Do not add a second place where documentation text is written.

- Assume Node.js 26 or later and Effect 4. Add no branches for other runtimes.
- The package is a command line tool with no programmatic API. Do not export functions from the package.
- Discover skills by reading `skills/**/SKILL.md` in the package directory. Do not depend on TanStack Intent's scanner, which needs the `tanstack-intent` keyword and an installed layout.
- The site is built from hast trees and written as plain files. Add no client framework. The client script and the styles are TypeScript modules that export strings, because the bundler has no raw imports. Keep each module under the line limit.
- Keep the look restrained: system fonts, one accent colour, a narrow reading column. Check a change in a browser at desktop and phone width and in both themes before merging.
