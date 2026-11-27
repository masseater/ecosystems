import { Effect, Option } from "effect";

import type { AuditContext, Drafts, Produced } from "#/features/audit-workflows/model/audit.ts";
import type { GitHubClient, GitHubEffect } from "#/features/audit-workflows/model/github.ts";

import type { UsesTarget } from "./uses-targets.ts";

const reported = new Set<string>();

const warned = (message: string): Effect.Effect<Drafts> => {
  if (reported.has(message)) {
    return Effect.succeed([]);
  }
  reported.add(message);
  return Effect.logWarning(`zizmor: ${message}`).pipe(Effect.as<Drafts>([]));
};

export const withGitHub =
  (context: AuditContext) =>
  (run: (client: GitHubClient) => GitHubEffect<Drafts>): Produced =>
    Option.match(context.github, {
      onNone: (): Produced => [],
      onSome: (client) =>
        run(client).pipe(Effect.catchTag("GitHubError", (failure) => warned(failure.message))),
    });

export interface OnlineCall<Found> {
  readonly client: GitHubClient;
  readonly found: Found;
  readonly target: UsesTarget;
  readonly context: AuditContext;
}

export const onlineCheck =
  <Found>(gather: (target: UsesTarget) => Option.Option<Found>) =>
  (run: (call: OnlineCall<Found>) => GitHubEffect<Drafts>) =>
  (target: UsesTarget, context: AuditContext): Produced =>
    Option.match(gather(target), {
      onNone: (): Produced => [],
      onSome: (found) => withGitHub(context)((client) => run({ client, found, target, context })),
    });

export const draftsIf =
  (draft: () => Drafts) =>
  (condition: boolean): Drafts => {
    if (condition) {
      return draft();
    }
    return [];
  };
