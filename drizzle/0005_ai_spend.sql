CREATE TABLE "ai_spend" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"ref" text,
	"calls" jsonb NOT NULL,
	"fal_fill_usd" double precision NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_spend" ADD CONSTRAINT "ai_spend_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_spend_at_idx" ON "ai_spend" USING btree ("at");