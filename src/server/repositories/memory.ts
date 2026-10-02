import {
  assertOwnerId,
  parseStoredInterviewSession,
  parseStoredProjectSpec,
  projectStatusFromSpec,
} from "../persistence/serialize";
import { PersistenceError, PersistenceErrorCode } from "../persistence/errors";
import {
  type Clock,
  type IdFactory,
  type InterviewRepository,
  type InterviewSessionRecord,
  type ProjectRecord,
  type ProjectRepository,
  cryptoIdFactory,
  systemClock,
} from "./types";

export interface MemoryStore {
  readonly projects: Map<string, ProjectRecord>;
  readonly sessions: Map<string, InterviewSessionRecord>;
}

export function createMemoryStore(): MemoryStore {
  return {
    projects: new Map(),
    sessions: new Map(),
  };
}

function cloneProject(record: ProjectRecord): ProjectRecord {
  return {
    ...record,
    spec: structuredClone(record.spec),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function cloneSession(record: InterviewSessionRecord): InterviewSessionRecord {
  return {
    ...record,
    session: structuredClone(record.session),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

function ownedProject(
  store: MemoryStore,
  projectId: string,
  ownerId: string,
): ProjectRecord | undefined {
  const project = store.projects.get(projectId);
  if (!project || project.ownerId !== ownerId) {
    return undefined;
  }

  return project;
}

function ownedSession(
  store: MemoryStore,
  sessionId: string,
  ownerId: string,
): InterviewSessionRecord | undefined {
  const session = store.sessions.get(sessionId);
  if (!session || session.ownerId !== ownerId) {
    return undefined;
  }

  return session;
}

export function createMemoryProjectRepository(
  store: MemoryStore,
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

      if (store.projects.has(id)) {
        throw new PersistenceError(
          PersistenceErrorCode.CONFLICT,
          "A project with this id already exists.",
        );
      }

      const now = clock.now();
      const record: ProjectRecord = {
        id,
        ownerId,
        name: spec.project.name,
        description: spec.project.description,
        spec,
        status: projectStatusFromSpec(spec),
        createdAt: now,
        updatedAt: now,
      };
      store.projects.set(id, record);
      return cloneProject(record);
    },

    async getProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const project = ownedProject(store, input.projectId, ownerId);
      return project ? cloneProject(project) : null;
    },

    async listProjects(input) {
      const ownerId = assertOwnerId(input.ownerId);
      return [...store.projects.values()]
        .filter((project) => project.ownerId === ownerId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map(cloneProject);
    },

    async updateProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const current = ownedProject(store, input.projectId, ownerId);
      if (!current) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      const spec = parseStoredProjectSpec(input.spec);
      const record: ProjectRecord = {
        ...current,
        name: spec.project.name,
        description: spec.project.description,
        spec,
        status: projectStatusFromSpec(spec),
        updatedAt: clock.now(),
      };
      store.projects.set(current.id, record);
      return cloneProject(record);
    },

    async deleteProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const current = ownedProject(store, input.projectId, ownerId);
      if (!current) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      for (const [sessionId, session] of store.sessions) {
        if (session.projectId === current.id) {
          store.sessions.delete(sessionId);
        }
      }

      store.projects.delete(current.id);
    },
  };
}

export function createMemoryInterviewRepository(
  store: MemoryStore,
  options: { clock?: Clock } = {},
): InterviewRepository {
  const clock = options.clock ?? systemClock;

  return {
    async createInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const session = parseStoredInterviewSession(input.session);
      const project = ownedProject(store, input.projectId, ownerId);
      if (!project) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Project not found.",
        );
      }

      if (store.sessions.has(session.id)) {
        throw new PersistenceError(
          PersistenceErrorCode.CONFLICT,
          "An interview session with this id already exists.",
        );
      }

      for (const existing of store.sessions.values()) {
        if (existing.projectId === input.projectId) {
          throw new PersistenceError(
            PersistenceErrorCode.CONFLICT,
            "This project already has an interview session.",
          );
        }
      }

      const now = clock.now();
      const record: InterviewSessionRecord = {
        id: session.id,
        projectId: input.projectId,
        ownerId,
        session,
        createdAt: now,
        updatedAt: now,
      };
      store.sessions.set(session.id, record);
      return cloneSession(record);
    },

    async getInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const record = ownedSession(store, input.sessionId, ownerId);
      return record ? cloneSession(record) : null;
    },

    async getInterviewSessionByProject(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const record = [...store.sessions.values()].find(
        (item) => item.projectId === input.projectId && item.ownerId === ownerId,
      );
      return record ? cloneSession(record) : null;
    },

    async updateInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const current = ownedSession(store, input.sessionId, ownerId);
      if (!current) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Interview session not found.",
        );
      }

      const session = parseStoredInterviewSession(input.session);
      if (session.id !== current.id) {
        throw new PersistenceError(
          PersistenceErrorCode.VALIDATION_FAILED,
          "Interview session id cannot change.",
        );
      }

      const record: InterviewSessionRecord = {
        ...current,
        session,
        updatedAt: clock.now(),
      };
      store.sessions.set(current.id, record);
      return cloneSession(record);
    },

    async deleteInterviewSession(input) {
      const ownerId = assertOwnerId(input.ownerId);
      const current = ownedSession(store, input.sessionId, ownerId);
      if (!current) {
        throw new PersistenceError(
          PersistenceErrorCode.NOT_FOUND,
          "Interview session not found.",
        );
      }

      store.sessions.delete(current.id);
    },
  };
}
