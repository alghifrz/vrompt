import { describe, expect, it } from "vitest";
import { createInterviewSession } from "../../core/interview/engine";
import type { InterviewSession } from "../../core/interview/types";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { PersistenceErrorCode } from "./errors";
import {
  parseStoredInterviewSession,
  parseStoredProjectSpec,
  serializeInterviewSession,
} from "./serialize";

const spec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field-service toolkit.",
    problem: "Visit details live in separate tools.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "draft",
  },
};

describe("persistence serialization", () => {
  it("round-trips a ProjectSpec", () => {
    const stored = JSON.parse(JSON.stringify(spec)) as unknown;
    expect(parseStoredProjectSpec(stored)).toEqual(spec);
  });

  it("rejects an invalid ProjectSpec", () => {
    expect(() => parseStoredProjectSpec({ project: { name: "" } })).toThrowError(
      expect.objectContaining({ code: PersistenceErrorCode.VALIDATION_FAILED }),
    );
  });

  it("round-trips an InterviewSession", () => {
    const session: InterviewSession = {
      ...createInterviewSession({ id: "sess-1" }),
      spec,
      messages: [{ role: "user", content: "Build FieldKit." }],
      currentQuestion: {
        id: "q-discovery-1",
        phase: "discovery",
        text: "What is the problem?",
        required: true,
      },
      skippedPhases: ["database"],
      questionSeq: 1,
    };

    const stored = JSON.parse(JSON.stringify(serializeInterviewSession(session)));
    expect(parseStoredInterviewSession(stored)).toEqual(session);
  });

  it("rejects a malformed stored interview session", () => {
    expect(() =>
      parseStoredInterviewSession({
        id: "sess-1",
        phase: "not-a-phase",
        spec,
        messages: [],
        completed: false,
        skippedPhases: [],
        questionSeq: 0,
      }),
    ).toThrowError(
      expect.objectContaining({ code: PersistenceErrorCode.VALIDATION_FAILED }),
    );
  });
});
