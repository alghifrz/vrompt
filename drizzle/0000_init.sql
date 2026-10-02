CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"spec" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"phase" text NOT NULL,
	"spec" jsonb NOT NULL,
	"messages" jsonb NOT NULL,
	"current_question" jsonb,
	"completed" boolean NOT NULL,
	"skipped_phases" jsonb NOT NULL,
	"question_seq" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_sessions_project_id_uidx" ON "interview_sessions" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "interview_sessions_owner_id_idx" ON "interview_sessions" USING btree ("owner_id");
