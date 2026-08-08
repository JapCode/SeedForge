CREATE TABLE "top_cut_brackets" (
	"tournament_id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"share_token" text,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE INDEX "tournaments_owner_id_idx" ON "tournaments" USING btree ("owner_id");