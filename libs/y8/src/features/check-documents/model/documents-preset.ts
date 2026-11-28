import { definePlugin } from "#/entities/rule/index.ts";
import { turned, whenGiven, withOptions } from "#/features/check-documents/lib/preset.ts";
import type { RuleSet } from "#/features/check-documents/lib/preset.ts";
import type { Plugin, Y8Config } from "#/shared/config/index.ts";

import {
  linkForwardSlash,
  linkTargetExists,
  noEmail,
  noLocalPath,
  noPlaceholder,
  sourceReference,
} from "./general-rules.ts";

const DOCUMENTS: RuleSet = {
  plugin: "docs",
  rules: {
    "link-target-exists": linkTargetExists,
    "link-forward-slash": linkForwardSlash,
    "source-reference": sourceReference,
    "no-local-path": noLocalPath,
    "no-email": noEmail,
    "no-placeholder": noPlaceholder,
  },
};

export const documentsPlugin: Plugin = definePlugin({ rules: DOCUMENTS.rules });

export interface DocumentsOptions {
  readonly emails?: readonly string[];
}

export const documents = (options: DocumentsOptions = {}): Y8Config => ({
  plugins: { [DOCUMENTS.plugin]: documentsPlugin },
  rules: {
    ...turned("error")(DOCUMENTS),
    ...whenGiven((allow) => withOptions(DOCUMENTS.plugin)("no-email", { allow }))(options.emails),
  },
});
