# @r_masseater/wism

This workspace is the engine of a linter for file structure and dependencies. The Rust core (`native/core`) only reads the tracked files and resolves their imports, `use` paths and Markdown links into one graph, which the napi addon (`native/node`) hands to TypeScript as one `Uint32Array` without copying. Every rule is TypeScript. The official rules are the presets in `src/app/presets`, published as the `@r_masseater/wism/presets` subpath; a project adds its own rules as plugins. Its settings go in `wism` in vite.config.ts.

- Keep rules out of the engine: the preset code (`src/app/presets` and the entities and features it uses) uses only the rule API and never the native addon. Move work into Rust only where OTel spans show the TypeScript side is too slow.
- Give Rust code tracing spans. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans go under the caller's trace.
- Build the addon with `vp run native`. The tests depend on that task.
- The presets ship as plain TypeScript with no native code. Their tests also run every check steiger's own tests make for the rules wism shares with it; `src/app/presets/fixtures/steiger/README.md` says how they were recorded.
