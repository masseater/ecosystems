import { afterPrefix } from "@masseater.dev/path-kit";
import { Option, String as Str } from "effect";

import { quote } from "#/shared/text/index.ts";

const LOCAL = "./";
const SELF_REPOSITORY = "$/";

export const localPath = (spec: string): Option.Option<string> =>
  Option.orElse(afterPrefix(LOCAL)(spec), () => afterPrefix(SELF_REPOSITORY)(spec));

export const isSelfReferenceWithRef = (spec: string): boolean =>
  Option.exists(afterPrefix(SELF_REPOSITORY)(spec), Str.includes("@"));

export const selfReferenceError = (spec: string): string =>
  `self repository reference ${quote(spec)} must not include @{ref}. "$/" always resolves to the commit of the running workflow. see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsuses`;
