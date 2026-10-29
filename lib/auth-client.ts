import { createAuthClient } from "better-auth/react";

/** Browser side of lib/auth.ts. Same origin, so no base URL is needed. */
export const authClient = createAuthClient();
