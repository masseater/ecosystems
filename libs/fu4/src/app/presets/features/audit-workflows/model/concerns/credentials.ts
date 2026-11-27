import type { Audit } from "#/app/presets/features/audit-workflows/model/audit.ts";
import { artipacked } from "#/app/presets/features/audit-workflows/model/rules/artipacked.ts";
import { githubApp } from "#/app/presets/features/audit-workflows/model/rules/github-app.ts";
import { hardcodedContainerCredentials } from "#/app/presets/features/audit-workflows/model/rules/hardcoded-container-credentials.ts";
import { overprovisionedSecrets } from "#/app/presets/features/audit-workflows/model/rules/overprovisioned-secrets.ts";
import { secretsInherit } from "#/app/presets/features/audit-workflows/model/rules/secrets-inherit.ts";
import { secretsOutsideEnv } from "#/app/presets/features/audit-workflows/model/rules/secrets-outside-env.ts";
import { unredactedSecrets } from "#/app/presets/features/audit-workflows/model/rules/unredacted-secrets.ts";
import { useTrustedPublishing } from "#/app/presets/features/audit-workflows/model/rules/use-trusted-publishing.ts";

export const CREDENTIALS: readonly Audit[] = [
  artipacked,
  secretsInherit,
  secretsOutsideEnv,
  overprovisionedSecrets,
  unredactedSecrets,
  hardcodedContainerCredentials,
  githubApp,
  useTrustedPublishing,
];
