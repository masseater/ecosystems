# ecosystems

The toolchain behind masseater's repositories, published to npm as `@r_masseater/*`.

| Package                                                                                                                                                                                        | What it is                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [msch](libs/msch)                                                                                                                                                                              | The repository checks that every masseater repository runs.                                                           |
| [vite-plus-adopt](libs/vite-plus-adopt)                                                                                                                                                        | Runs outside checks such as h56m through Vite+ with one command.                                                      |
| [y8](libs/y8), [wism](libs/wism), [fu4](libs/fu4), [h56m](libs/h56m), [i68](libs/i68)                                                                                                          | Linters for Markdown, repository structure, GitHub Actions, secrets and music theory, each with a `-presets` package. |
| [fumx-parser](libs/fumx-parser)                                                                                                                                                                | Parser and analysis for the `.fumx` text music format.                                                                |
| [oxlint-plugin-decision](libs/oxlint-plugin-decision), [oxlint-typed-rules](libs/oxlint-typed-rules), [textlint-rule-preset-ja](libs/textlint-rule-preset-ja), [vitest-otlp](libs/vitest-otlp) | Lint plugins and a Vitest plugin that msch and the other repositories use.                                            |

Every check of this repository runs through msch: `vp run verify`.

## License

[AGPL-3.0](LICENSE) for the repository. Each package states its own license in its own directory.
