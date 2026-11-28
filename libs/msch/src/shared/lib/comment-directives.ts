export const COMMENT_DIRECTIVES: readonly string[] = [
  "oxlint-disable",
  "textlint-disable",
  "textlint-enable",
  String.raw`\* @internal \*?$`,
  String.raw`\* @msch \S+ \*?$`,
  String.raw`\* @stability (?:experimental|unstable) \*?$`,
  String.raw`shellcheck \w`,
  String.raw`zizmor: ignore\[`,
  String.raw`exit: \S`,
  "> statement-breakpoint$",
  "/ <reference (?:types|path|lib)=",
];
