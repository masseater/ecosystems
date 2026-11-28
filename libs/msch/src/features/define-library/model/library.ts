import { defineConfig } from "vite-plus";

import { LOCKED } from "#/shared/lib/locked-inputs.ts";

/** @internal */
export type LibraryTask =
  | string
  | Readonly<{ command: string | readonly string[]; dependsOn?: readonly string[] }>;

/** @internal */
export type LibraryPlatform = "node" | "neutral" | "browser";

/** @internal */
export interface LibraryOptions {
  readonly entry: Readonly<Record<string, string>>;
  readonly platform?: LibraryPlatform;
  readonly alwaysBundle?: readonly string[];
  readonly tasks?: Readonly<Record<string, LibraryTask>>;
}

/** @internal */
export const library = ({
  entry,
  platform = "node",
  alwaysBundle = [],
  tasks = {},
}: LibraryOptions): ReturnType<typeof defineConfig> =>
  defineConfig({
    run: {
      tasks: {
        test: { command: "vp test run", cache: LOCKED },
        build: { command: "vp pack", cache: LOCKED },
        ...tasks,
      },
    },
    pack: {
      entry: { ...entry },
      platform,
      deps: { alwaysBundle: [...alwaysBundle] },
      sourcemap: true,
      publint: { strict: true },
      dts: true,
    },
    test: { include: ["src/**/*.test.ts"] },
  });
