# @r_masseater/plugin-kit

This workspace holds the code that more than one Claude Code plugin in masseater/skills needs. The plugins depend on it from npm, so what it exports is JavaScript that Node.js runs from `node_modules`.

- Assume Node.js 26 or later. Write it with Effect and bundle Effect into `dist`, so a plugin installs this one package and loads only what it uses.
- Put code here when a second plugin needs it. Code that one plugin uses stays in that plugin.
