ALTER TABLE "profiles" ADD COLUMN "logo_tone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "logo_version" integer DEFAULT 0 NOT NULL;