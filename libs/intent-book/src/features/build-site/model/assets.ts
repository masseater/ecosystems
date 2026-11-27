import { Array as Arr, pipe } from "effect";

import type { SiteFile } from "#/shared/lib/site-file.ts";

import { SCRIPT } from "./assets-script.ts";
import { BASE_STYLES } from "./assets-styles-1.ts";
import { COMPONENT_STYLES } from "./assets-styles-2.ts";
import { PAGE_STYLES } from "./assets-styles-3.ts";

const STYLE_SEPARATOR = "\n";

export const ASSET_FILES: readonly SiteFile[] = [
  {
    path: "assets/book.css",
    content: pipe([BASE_STYLES, COMPONENT_STYLES, PAGE_STYLES], Arr.join(STYLE_SEPARATOR)),
  },
  { path: "assets/book.js", content: SCRIPT },
];
