import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { interviewSessions, projects } from "./schema";

describe("database schema", () => {
  it("defines the projects table with required columns", () => {
    const columns = getTableColumns(projects);

    expect(getTableName(projects)).toBe("projects");
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "ownerId",
        "name",
        "description",
        "spec",
        "status",
        "createdAt",
        "updatedAt",
      ]),
    );
    expect(columns.id.primary).toBe(true);
    expect(columns.ownerId.notNull).toBe(true);
    expect(columns.spec.notNull).toBe(true);
  });

  it("defines interview sessions with a project foreign key", () => {
    const columns = getTableColumns(interviewSessions);

    expect(getTableName(interviewSessions)).toBe("interview_sessions");
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        "id",
        "projectId",
        "ownerId",
        "phase",
        "spec",
        "messages",
        "currentQuestion",
        "completed",
        "skippedPhases",
        "questionSeq",
        "createdAt",
        "updatedAt",
      ]),
    );
    expect(columns.projectId.notNull).toBe(true);
  });

  it("includes the initial migration with uniqueness and timestamps", async () => {
    const sql = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../../../drizzle/0000_init.sql", import.meta.url), "utf8"),
    );

    expect(sql).toContain("CREATE TABLE \"projects\"");
    expect(sql).toContain("CREATE TABLE \"interview_sessions\"");
    expect(sql).toContain("interview_sessions_project_id_projects_id_fk");
    expect(sql).toContain("interview_sessions_project_id_uidx");
    expect(sql).toContain("created_at");
    expect(sql).toContain("updated_at");
  });
});
