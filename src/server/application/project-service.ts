import type { ProjectSpec } from "../../core/schema/project-spec";
import type { RequireAuth } from "../auth/require-auth";
import type { ProjectRecord, ProjectRepository } from "../repositories/types";

export function createProjectService(
  requireAuth: RequireAuth,
  projects: ProjectRepository,
) {
  return {
    async create(spec: ProjectSpec, id?: string): Promise<ProjectRecord> {
      const { userId } = await requireAuth();
      return projects.createProject({ ownerId: userId, spec, id });
    },

    async get(projectId: string): Promise<ProjectRecord | null> {
      const { userId } = await requireAuth();
      return projects.getProject({ projectId, ownerId: userId });
    },

    async list(): Promise<ProjectRecord[]> {
      const { userId } = await requireAuth();
      return projects.listProjects({ ownerId: userId });
    },

    async update(projectId: string, spec: ProjectSpec): Promise<ProjectRecord> {
      const { userId } = await requireAuth();
      return projects.updateProject({ projectId, ownerId: userId, spec });
    },

    async delete(projectId: string): Promise<void> {
      const { userId } = await requireAuth();
      return projects.deleteProject({ projectId, ownerId: userId });
    },
  };
}
