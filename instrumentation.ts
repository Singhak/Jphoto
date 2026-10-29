import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "./lib/report";

/**
 * Error monitoring on the server. Sentry stays off until NEXT_PUBLIC_SENTRY_DSN is set (see .env.example).
 * Errors a route catches itself are sent with reportError (lib/report.ts); onRequestError catches the rest.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" && process.env.NEXT_RUNTIME !== "edge") return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Errors only: no performance tracing, and nothing private about jewellers (see lib/report.ts).
    dataCollection: sentryDataCollection,
  });
}

export const onRequestError = Sentry.captureRequestError;
