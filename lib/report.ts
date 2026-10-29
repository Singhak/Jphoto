import * as Sentry from "@sentry/nextjs";

/**
 * What Sentry may collect, for server and browser alike. Its defaults send cookies (our login sessions), request
 * bodies (jewellers' photos, payment details) and local variables; none of that leaves our servers. We set the
 * account id ourselves (lib/auth.ts), never the email.
 */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { allow: ["user-agent", "referer", "content-type", "content-length"] },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  genAI: { inputs: false, outputs: false },
  stackFrameVariables: false,
} satisfies NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"];

/**
 * Logs a failure the jeweller was shielded from (a friendly message, a fallback) and sends it to Sentry,
 * so we hear about it before they tell us. `where` names the step and groups the issues in Sentry.
 */
export function reportError(where: string, err: unknown, extra?: Record<string, unknown>) {
  console.error(where, err);
  Sentry.captureException(err, { tags: { where }, extra });
}

/** Something degraded but the jeweller still got a result, such as a fallback engine or a skipped check. */
export function reportWarning(where: string, message: string, extra?: Record<string, unknown>) {
  console.warn(`${where}: ${message}`);
  // One Sentry issue per step, not one per wording of the underlying error.
  Sentry.captureMessage(`${where}: ${message}`, { level: "warning", tags: { where }, extra, fingerprint: [where] });
}
