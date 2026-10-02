import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Storage schema only. Canonical domain types remain in src/core.
 * One interview session per project (unique project_id). History can be
 * added later without changing ProjectSpec.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    spec: jsonb("spec").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_owner_id_idx").on(table.ownerId),
  ],
);

export const interviewSessions = pgTable(
  "interview_sessions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    phase: text("phase").notNull(),
    spec: jsonb("spec").notNull(),
    messages: jsonb("messages").notNull(),
    currentQuestion: jsonb("current_question"),
    completed: boolean("completed").notNull(),
    skippedPhases: jsonb("skipped_phases").notNull(),
    questionSeq: integer("question_seq").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("interview_sessions_project_id_uidx").on(table.projectId),
    index("interview_sessions_owner_id_idx").on(table.ownerId),
  ],
);
