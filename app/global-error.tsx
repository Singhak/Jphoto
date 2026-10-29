"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { themeScript } from "@/lib/theme-script";
import "./globals.css";

/** Shown when a page crashes outright. It replaces the root layout, so it brings its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh items-center justify-center bg-bg p-6 text-text antialiased">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Something went wrong on our side.</p>
          <p className="mt-2 text-sm text-dim">We’ve been told about it. Your photos and credits are safe.</p>
          <button onClick={reset} className="btn-light mt-5">Try again</button>
        </div>
      </body>
    </html>
  );
}
