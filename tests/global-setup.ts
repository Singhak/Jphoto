import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Wipes the test database and applies every migration in drizzle/, so the tests see the real schema. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set. See Tests in README.md.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must not be DATABASE_URL: the tests wipe it.");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
}
