# @r_masseater/kata

This workspace draws infographics from a few lines of Typst. `typ/` holds the parts, which are Typst functions that lay themselves out: a node for each of the six kinds of element, a flow with an optional hero number, and bars with a limit. `src/` is the TypeScript that mounts the parts and the icons next to a figure and compiles it with `@myriaddreamin/typst-ts-node-compiler`.

- The six kinds, their colors and their shapes are the ones in `plugins/cogload/skills/infographic/references/palette.md` of masseater/skills. Keep `typ/theme.typ` and `typ/shapes.typ` in step with that file.
- A figure reads the theme from `sys.inputs.theme`, so one source renders in light and dark. Do not put colors anywhere but `typ/theme.typ`.
- Parts size themselves from their content. Do not take coordinates or sizes from the figure's author.
- Typst's `top`, `bottom`, `left`, `right`, `center` and `horizon` are alignments. Do not name a variable after them.
- Do not vendor Typst packages: CeTZ is LGPL-3.0. Draw with Typst's own `curve`, `place` and `measure`.
- Icons come from `@material-symbols/svg-400` and are mounted only when a figure names them in quotes.
- The feature layer compiles and does no file reading. `src/app/render.ts` reads the parts and icons and provides the Node services, so the effects it uses stay out of the exports.
