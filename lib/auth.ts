import * as Sentry from "@sentry/nextjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db, schema } from "./db";

/**
 * Google sign-in. Users and sessions live in our own Postgres (lib/db/schema.ts),
 * so login moves with the database instead of being tied to a hosting provider.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },
  // Long sessions: jewellers sign in once on the shop phone and stay signed in.
  session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
  plugins: [nextCookies()],
});

/** The signed-in user's id, or null. Every API route that touches account data checks this itself. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  // Errors in this request show which account hit them (the id only, not the email).
  if (session) Sentry.setUser({ id: session.user.id });
  return session?.user.id ?? null;
}

export const unauthorized = () => Response.json({ error: "Please sign in again." }, { status: 401 });
