# @r_masseater/mapped-import

This workspace holds the shared parts for importing files in your own format from TypeScript: segments that describe how a file maps to source code, the output a TypeScript content mapper needs, and a Vite plugin that turns a file into a module.

- Assume Vite+ and Node.js 26 or later. Make `vite-plus` and `effect` peer dependencies.
- `ts-content-mapper` is pinned to an exact version. Update it together with the tests that cover the mapped output.
