import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Any Postgres works: set DATABASE_URL to Supabase, Neon, RDS or your own server.
 * prepare: false keeps it working behind transaction poolers (Supabase port 6543, PgBouncer).
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");

// Reuse one pool across dev hot reloads instead of opening a new one on every edit.
const g = globalThis as unknown as { pg?: postgres.Sql };
const client = g.pg ?? postgres(url, { prepare: false, max: 10 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export { schema };
