#!/usr/bin/env node
import { runCli } from "#/app/runtime.ts";
import { wakeOnRedMain } from "#/features/wake-project/index.ts";

runCli(wakeOnRedMain());
