import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

/** Google sign-in, sign-out and session endpoints, handled by Better Auth. */
export const { GET, POST } = toNextJsHandler(auth);
