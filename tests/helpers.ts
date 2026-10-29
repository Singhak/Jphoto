import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, profiles, user } from "@/lib/db/schema";

/** A fresh jeweller with this many credits. Each test makes its own, so tests never share rows. */
export async function makeJeweller(credits = 0) {
  const id = `test_${randomUUID()}`;
  await db.insert(user).values({ id, name: "Test Jeweller", email: `${id}@example.com` });
  await db.insert(profiles).values({ userId: id, credits, phone: "9876543210" });
  return id;
}

export async function makeCreation(userId: string) {
  const id = randomUUID();
  await db.insert(creations).values({ id, userId, piece: "necklace", styleId: "studio-white", collection: "Bridal" });
  return id;
}

export async function creditsOf(userId: string) {
  const [row] = await db.select({ credits: profiles.credits }).from(profiles).where(eq(profiles.userId, userId));
  return row.credits;
}
