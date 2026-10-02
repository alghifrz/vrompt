import type { InterviewSession } from "../../core/interview/types";
import type { ProjectSpec, ProjectStatus } from "../../core/schema/project-spec";

export interface Clock {
  now(): Date;
}

export interface IdFactory {
  next(): string;
}

export interface ProjectRecord {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly description: string;
  readonly spec: ProjectSpec;
  readonly status: ProjectStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InterviewSessionRecord {
  readonly id: string;
  readonly projectId: string;
  readonly ownerId: string;
  readonly session: InterviewSession;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProjectRepository {
  createProject(input: {
    ownerId: string;
    spec: ProjectSpec;
    id?: string;
  }): Promise<ProjectRecord>;
  getProject(input: {
    projectId: string;
    ownerId: string;
  }): Promise<ProjectRecord | null>;
  listProjects(input: { ownerId: string }): Promise<ProjectRecord[]>;
  updateProject(input: {
    projectId: string;
    ownerId: string;
    spec: ProjectSpec;
  }): Promise<ProjectRecord>;
  deleteProject(input: {
    projectId: string;
    ownerId: string;
  }): Promise<void>;
}

export interface InterviewRepository {
  createInterviewSession(input: {
    ownerId: string;
    projectId: string;
    session: InterviewSession;
  }): Promise<InterviewSessionRecord>;
  getInterviewSession(input: {
    sessionId: string;
    ownerId: string;
  }): Promise<InterviewSessionRecord | null>;
  getInterviewSessionByProject(input: {
    projectId: string;
    ownerId: string;
  }): Promise<InterviewSessionRecord | null>;
  updateInterviewSession(input: {
    sessionId: string;
    ownerId: string;
    session: InterviewSession;
  }): Promise<InterviewSessionRecord>;
  deleteInterviewSession(input: {
    sessionId: string;
    ownerId: string;
  }): Promise<void>;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export const cryptoIdFactory: IdFactory = {
  next: () => crypto.randomUUID(),
};
