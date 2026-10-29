"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { hasShowcase, Showcase } from "@/components/Showcase";
import { authClient } from "@/lib/auth-client";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/studio" });
    // On success the browser has already left for Google; we only get here on failure.
    if (error) {
      setError("Couldn’t reach Google. Check your internet and try again.");
      setBusy(false);
    }
  };

  return (
    <main className={`mx-auto grid min-h-dvh items-center gap-6 px-4 py-8 ${hasShowcase ? "max-w-5xl lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-10" : "max-w-sm"}`}>
      <div className="panel w-full p-6 text-center sm:p-8">
        <Icon.logo className="mx-auto size-10 text-light" />
        <h1 className="mt-4 font-head text-3xl font-bold tracking-tight">{BRAND.name}</h1>
        <p className="mt-1 text-dim">{BRAND.tagline}</p>
        <button onClick={signIn} disabled={busy} className="btn-light mt-8 w-full py-3">
          <GoogleMark className="size-5" /> {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <div className="mt-6 flex gap-2.5 rounded-lg border border-line p-3 text-left text-xs text-dim">
          <Icon.shield className="size-4 shrink-0 text-light" />
          <p>
            <span className="font-medium text-text">Your designs stay yours.</span> Photos are private to your account, never used to train AI and
            never shown to anyone else, so unreleased pieces are safe to upload.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-lg">
        <Showcase />
      </div>
    </main>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
