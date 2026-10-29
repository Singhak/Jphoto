# One container for the web app. Needs about 4 GB of RAM when the local cutout model runs
# (no FAL_KEY, or as the fallback when fal fails); about 1 GB when fal does all cutouts.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_ settings are baked into the browser code at build time.
ARG NEXT_PUBLIC_MODEL_LOOKS=""
ENV NEXT_PUBLIC_MODEL_LOOKS=$NEXT_PUBLIC_MODEL_LOOKS
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
# Optional: uploads source maps to Sentry during the build. Used by the build stage only, not in the final image.
ARG SENTRY_AUTH_TOKEN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# Applies any new database migrations, then starts the app.
CMD ["sh", "-c", "npx drizzle-kit migrate && npx next start -p 3000"]
