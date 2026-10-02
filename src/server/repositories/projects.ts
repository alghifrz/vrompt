import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, type Database } from "../db/client";
import { projects } from "../db/schema";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import {
  assertOwnerId,
  parseStoredProjectSpec,
  projectStatusFromSpec,
} from "../persistence/serialize";
import {
  type Clock,
  type IdFactory,
  type ProjectRecord,
  type ProjectRepository,
  cryptoIdFactory,
  systemClock,
} from "./types";

function mapRow(
  row: typeof projects.$inferSelect,
): ProjectRecord {
  const spec = parseStoredProjectSpec(row.spec);
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    spec,
    status: projectStatusFromSpec(spec),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createProjectRepository(
  db: Database = getDb(),
  options: { clock?: Clock; ids?: IdFactory } = {},
): ProjectRepository {
  const clock = options.clock ?? systemClock;
  const ids = options.ids ?? cryptoIdFactory;

  return {
    async createProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const spec = parseStoredProjectSpec(input.spec);
      const id = (input.id ?? ids.next()).trim();
      if (!id) {
        throw new PersistenceError(
          PersistenceErrorCode.VALIDATION_FAILED,
          "Project id is required.",
        );
      }

      const now = clock.now();
      try {
        const [row] = await db
          .insert(projects)
          .values({
            id,
            ownerId,
            name: spec.project.name,
            description: spec.project.description,
            spec,
            status: projectStatusFromSpec(spec),
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!row) {
          throw new PersistenceError(
            PersistenceErrorCode.DATABASE_ERROR,
            "Project could not be created.",
          );
        }

        return mapRow(row);
      } catch (error) {
        if (error instanceof PersistenceError) {
          throw error;
        }

        throw new PersistenceError(
          PersistenceErrorCode.DATABASE_ERROR,
          "Project could not be created.",
        );
      }
    },

    async getProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const [row] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)))
        .limit(1);

      return row ? mapRow(row) : null;
    },

    async listProjects(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, ownerId))
        .orderBy(asc(projects.createdAt));

      return rows.map(mapRow);
    },

    async updateProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const spec = parseStoredProjectSpec(input.spec);
      const [row] = await db
        .update(projects)
        .set({
          name: spec.project.name,
          description: spec.project.description,
          spec,
          status: projectStatusFromSpec(spec),
          updatedAt: clock.now(),
        })
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)))
        .returning();

      if (!row) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      return mapRow(row);
    },

    async deleteProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ownerId)))
        .returning({ id: projects.id });

      if (deleted.length === 0) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }
    },
  };
}
