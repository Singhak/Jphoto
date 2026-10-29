CREATE TABLE "brochures" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"collection" text NOT NULL,
	"template" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"items" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "gstin" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "hours" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "brochures" ADD CONSTRAINT "brochures_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brochures_user_collection_idx" ON "brochures" USING btree ("user_id","collection");