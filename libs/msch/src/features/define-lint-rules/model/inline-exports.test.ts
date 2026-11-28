import { Option, Record, pipe } from "effect";
import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { mschLintPlugin } from "./plugin.ts";

const MESSAGE =
  "export は宣言に付ける（export const・export function など）。ファイルの末尾で export { … } にまとめない。";

const rule = pipe(
  Record.get(mschLintPlugin.rules, "inline-exports"),
  Option.getOrThrowWith(() => new Error("rule inline-exports is missing")),
);

interface Expected {
  readonly code: string;
  readonly errors: [{ readonly message: string }];
}

const invalid = (code: string): Expected => ({ code, errors: [{ message: MESSAGE }] });

RuleTester.describe = (text, run): void => {
  describe(text, () => {
    run();
  });
};
RuleTester.it = (text, run): void => {
  it(text, () => {
    run();
  });
};

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run("inline-exports", rule, {
  valid: [
    "export const a = 1;\nexport function b() {}\n",
    'export { a } from "./a.ts";\nexport type { B } from "./b.ts";\nexport * from "./c.ts";\n',
    "export {};\n",
    "const a = 1;\nexport default a;\n",
    "class A {}\nexport type { A };\n",
  ],
  invalid: [
    invalid("const a = 1;\nfunction b() {}\nexport { a, b };\n"),
    invalid("type A = string;\ninterface B {}\nexport type { A, B };\n"),
    invalid("const a = 1;\ntype B = string;\nexport { a, type B };\n"),
    invalid("const { a, b } = obj;\nexport { a };\n"),
    invalid("const a = 1;\nexport { a as b };\n"),
    invalid("const a = 1;\nexport { a as default };\n"),
    invalid('import { a, b as c } from "./a.ts";\nexport { a, c };\n'),
    invalid('import type { A } from "./a.ts";\nexport type { A };\n'),
    invalid('declare module "m" {\n  const a: number;\n  export { a };\n}\n'),
  ],
});
