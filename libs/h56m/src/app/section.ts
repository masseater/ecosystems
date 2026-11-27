import { sectionOf } from "@masseater.dev/lint-host";

import type { H56mConfig } from "#/shared/config/index.ts";

export const h56mSection = sectionOf<H56mConfig>({ name: "h56m", fallback: {} });
