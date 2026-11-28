import { Function as Fn, Match } from "effect";

import type { Event } from "#/app/presets/entities/workflow/index.ts";
import { checkCallDefaults } from "#/app/presets/features/check-workflows/lib/events/call.ts";
import { checkDispatch } from "#/app/presets/features/check-workflows/lib/events/dispatch.ts";
import { checkSchedule } from "#/app/presets/features/check-workflows/lib/events/schedule.ts";
import { checkWebhook } from "#/app/presets/features/check-workflows/lib/events/webhook.ts";
import {
  NOOP,
  eachEvent,
  workflowRule,
} from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";

const checkEvent = (fail: Fail): ((event: Event) => void) =>
  Match.type<Event>().pipe(
    Match.discriminatorsExhaustive("type")({
      schedule: checkSchedule(fail),
      workflow_dispatch: checkDispatch(fail),
      workflow_call: checkCallDefaults(fail),
      webhook: checkWebhook(fail),
      repository_dispatch: Fn.constVoid,
      image_version: Fn.constVoid,
    }),
  );

export const events = workflowRule({
  description: "Reports invalid triggers, filters, schedules and inputs in the on section",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-unknown-webhook-event-and-activity-types",
  visitor: (fail): Visitor => ({
    ...NOOP,
    workflowPre: eachEvent(checkEvent(fail)),
  }),
});
