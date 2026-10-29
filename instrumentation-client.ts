import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "./lib/report";

/** Error monitoring in the browser. Off until NEXT_PUBLIC_SENTRY_DSN is set when the app is built. */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  dataCollection: sentryDataCollection,
  // Noise from browser extensions and flaky shop Wi-Fi, not our bugs.
  ignoreErrors: ["ResizeObserver loop", "Failed to fetch", "NetworkError when attempting to fetch resource", "Load failed"],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
