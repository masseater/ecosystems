# ecosystems

The toolchain behind masseater's repositories, published to npm as `@r_masseater/*`.

It holds the repository checks and the linters with their presets, the parser for the `.fumx` text music format, and the lint plugins and test plugins they need. Each package has a README in its own directory under `libs/`.

Every check of this repository runs through one command: `vp run verify`.

## License

[AGPL-3.0](LICENSE) for the repository. Each package states its own license in its own directory.
