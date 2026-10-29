# Jphoto

Catalogue photos for Indian jewellers from plain phone photos, with an exact-design guarantee: the piece is cut out of the jeweller's photo, a background is built around it, the original pixels are put back on top, and every result is checked against the upload before it is shown. Jewellers pay only for photos they download.

Next.js (App Router) + TypeScript, Postgres via Drizzle, Google sign-in via Better Auth, Cashfree payments.

## Run it locally

```bash
npm install
cp .env.example .env            # then fill in the values (see below)
docker compose up -d            # Postgres; use PG_PORT=5434 if 5432 is taken
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The landing page is public; the studio needs Google sign-in.

### Settings (`.env`)

| Setting | Needed for |
|---|---|
| `DATABASE_URL` | Everything. Any Postgres works (Docker, Neon, Supabase, RDS). |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Sign-in. The Google redirect URI is `{BETTER_AUTH_URL}/api/auth/callback/google`. |
| `FAL_KEY` | Cutouts on fal (falls back to the local model if fal fails) and the marble, velvet, silk and festive looks. |
| `GEMINI_API_KEY` | Prop removal, the quality judge and model looks. Turn on billing: the free tier may use data for training. |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` | Real payments. Without them, top-ups add free test credits (development only). |
| `STORAGE_DRIVER` and `S3_*` | Where photos are kept. Use `s3` in production; `local` writes to `.cache/storage`. |
| `NEXT_PUBLIC_MODEL_LOOKS` | `1` shows model looks. Off until exact mode is built. Read at build time. |
| `LIMIT_*` | Daily caps per account on photo checks, previews, brochure PDFs, zips and payment orders (see `lib/limits.ts`). |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring in Sentry, server and browser. Off when empty. Read at build time. Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` at build time for readable stack traces. |

## How it fits together

- `lib/pipeline/`: the image pipeline: cutout, photo checks, scene generation, paste-back, fidelity check.
- `app/api/extract`, `app/api/render`: photo check and preview, both free and capped by `lib/limits.ts`.
- `app/api/downloads`, `app/api/renders/[id]`: downloading is the only step that spends a credit (`lib/account.ts`). Four or more photos come as one streamed zip from `app/api/downloads/zip` (`lib/zip.ts`).
- `instrumentation.ts`, `instrumentation-client.ts`, `lib/report.ts`: Sentry. Errors a route catches and turns into a friendly message are sent with `reportError`, so they still reach us.
- `app/api/payments/*` and `lib/payments.ts`: Cashfree orders. Credits are added only after asking Cashfree that the order is paid, exactly once, whether the webhook or the jeweller's return gets there first.
- `app/(site)/`: public landing, privacy, terms, refunds and contact pages. `app/(app)/`: the signed-in studio.

## Checks

```bash
npm run typecheck
npm run lint
npm test              # payments, downloads and limits against a real Postgres (see Tests)
npm run validate      # runs the pipeline on validation/input photos and prints paid-call counts
npm run spend         # AI cost per downloaded photo from live usage; set the SPEND_* prices in .env first
```

### Tests

`npm test` wipes and migrates the database in `TEST_DATABASE_URL`, so it must be its own database, never `DATABASE_URL` (the tests refuse to run if they match). With docker compose: `docker compose exec postgres createdb -U jphoto jphoto_test`. The tests stub Cashfree, so no keys are needed. CI runs the same checks (`.github/workflows/ci.yml`).

## Deploy

The `Dockerfile` builds one container that applies migrations on start. Give it about 4 GB of RAM if the local cutout model may run (no `FAL_KEY`, or as the fallback when fal fails), and about 1 GB if fal always does cutouts. Use managed Postgres and an S3-compatible bucket (Cloudflare R2, S3), since files written inside the container are lost on redeploy.

Before launch:

1. Check the business details in `lib/brand.ts` match Infynetic's Cashfree KYC (legal pages read them).
2. Set Cashfree production keys and `CASHFREE_ENV=production`. Each order tells Cashfree to call `{BETTER_AUTH_URL}/api/payments/webhook`, which must be https.
3. Run `npm run samples` once the AI keys work, so the landing and login pages show real before/after photos.
