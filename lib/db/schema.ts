import { sql } from "drizzle-orm";
import { boolean, check, doublePrecision, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { BrochureLayoutItem } from "../brochure";
import type { PaidCall } from "../pipeline/usage";

/**
 * Plain Postgres tables: nothing here depends on the host, so the database can move
 * between Supabase, Neon, RDS or a self-hosted server with pg_dump.
 * Change this file, then run `npm run db:generate` and commit the new file in drizzle/.
 */

// Login tables, in the shape Better Auth expects (see lib/auth.ts).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The jeweller's account.

/** One row per user, made on first visit with the welcome credits. */
export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    shopName: text("shop_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    /** Printed on brochures (lib/brochure.ts). */
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    gstin: text("gstin").notNull().default(""),
    hours: text("hours").notNull().default(""),
    /** The shop logo is stored at users/{id}/logo.png (lib/logo.ts). "" means no logo. */
    logoTone: text("logo_tone", { enum: ["", "dark", "light", "solid"] }).notNull().default(""),
    /** Goes up with each new logo, so browsers and kept PDFs pick up the new one. */
    logoVersion: integer("logo_version").notNull().default(0),
    credits: integer("credits").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // The last line of defence against spending credits twice.
  (t) => [check("credits_not_negative", sql`${t.credits} >= 0`)],
);

/** Every change to a balance, newest shown first in the wallet. Credits are positive for top-ups, negative for downloads. */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind", { enum: ["welcome", "top-up", "download", "refund"] }).notNull(),
    credits: integer("credits").notNull(),
    note: text("note").notNull(),
  },
  (t) => [index("credit_ledger_user_idx").on(t.userId, t.at)],
);

/** A finished photo that passed the checks. The image itself is in storage under the same id (lib/renders.ts). */
export const creations = pgTable(
  "creations",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    piece: text("piece").notNull(),
    styleId: text("style_id").notNull(),
    collection: text("collection").notNull(),
    /** What the jeweller types about the piece (brochures, share frames). Blank means "don't print it". */
    designName: text("design_name").notNull().default(""),
    designCode: text("design_code").notNull().default(""),
    purity: text("purity").notNull().default(""),
    /** Grams, as typed: "42.6". */
    weight: text("weight").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when the credit is spent; downloading again after that is free. */
    downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
    flaggedAt: timestamp("flagged_at", { withTimezone: true }),
    flagNote: text("flag_note"),
  },
  (t) => [index("creations_user_idx").on(t.userId, t.createdAt)],
);

/** One Cashfree order. Credits are added once, when the order is confirmed as paid (lib/payments.ts). */
export const payments = pgTable(
  "payments",
  {
    orderId: text("order_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    photos: integer("photos").notNull(),
    /** Whole rupees, taxes included. */
    amount: integer("amount").notNull(),
    status: text("status", { enum: ["created", "paid", "failed"] }).notNull().default("created"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("payments_user_idx").on(t.userId, t.createdAt)],
);

/**
 * Work done for a jeweller that costs us even if nothing is bought: photo checks and previews (AI calls),
 * brochure PDFs and zips (server time), payment orders (Cashfree). lib/limits.ts caps them per day, and previews per look.
 */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind", { enum: ["check", "preview", "pdf", "zip", "order"] }).notNull(),
    /** Previews only: "{cutoutId}:{styleId}", to count redos of one look. */
    ref: text("ref"),
  },
  (t) => [index("usage_events_user_idx").on(t.userId, t.kind, t.at), index("usage_events_ref_idx").on(t.userId, t.ref)],
);

/**
 * Paid AI calls made for one photo check or preview, whether or not it succeeded or was shown.
 * Compared with downloads by `npm run spend` to see what a sold photo really costs us.
 */
export const aiSpend = pgTable(
  "ai_spend",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind", { enum: ["check", "preview"] }).notNull(),
    /** Previews only: "{cutoutId}:{styleId}", as in usage_events. */
    ref: text("ref"),
    /** Count of each paid call (lib/pipeline/usage.ts). */
    calls: jsonb("calls").$type<Record<PaidCall, number>>().notNull(),
    /** Exact, from the megapixels sent. Other calls are priced in the report. */
    falFillUsd: doublePrecision("fal_fill_usd").notNull(),
  },
  (t) => [index("ai_spend_at_idx").on(t.at)],
);

/** A jeweller's brochure for one collection: the layout choices and the details printed under each photo. */
export const brochures = pgTable(
  "brochures",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    collection: text("collection").notNull(),
    template: text("template").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    /** In page order. Only downloaded photos from this collection (checked in lib/account.ts). Name, weight and so on live on the photo. */
    items: jsonb("items").$type<BrochureLayoutItem[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("brochures_user_collection_idx").on(t.userId, t.collection)],
);
