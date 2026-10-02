import { describe, expect, it } from "vitest";
import {
  type ProjectSpec,
  ProjectSpecSchema,
} from "./project-spec";

const minimalProject = {
  name: "Notebook",
  description: "A personal notebook for capturing ideas.",
  problem: "Ideas are lost across scattered notes.",
  targetUsers: ["Individual writers"],
  type: "web application",
  status: "draft",
} as const;

const minimalSpec = {
  project: minimalProject,
};

const fullSpec = {
  project: {
    name: "FieldKit",
    description: "A field-service toolkit for scheduling visits and logging work.",
    problem: "Dispatchers and technicians keep visit details in separate tools.",
    targetUsers: ["Dispatchers", "Field technicians"],
    type: "web application",
    status: "ready",
  },
  goals: {
    primary: [
      {
        id: "goal-schedule-visits",
        statement: "Let dispatchers assign visits without double-booking technicians.",
      },
    ],
    successCriteria: [
      "A dispatcher can assign a visit in under two minutes.",
      "Technicians can close a visit from a phone browser.",
    ],
  },
  features: [
    {
      id: "feature-visit-board",
      name: "Visit board",
      description: "Show today's assigned visits and their current status.",
      priority: "must",
      status: "approved",
      acceptanceCriteria: [
        "The board lists each visit assigned for the current day.",
        "A visit status change is visible after refresh.",
      ],
    },
    {
      id: "feature-offline-notes",
      name: "Offline notes",
      description: "Allow technicians to draft visit notes without a network.",
      priority: "should",
      status: "planned",
      acceptanceCriteria: ["Notes drafted offline are saved when connectivity returns."],
    },
    {
      id: "feature-customer-portal",
      name: "Customer portal",
      description: "Let customers see upcoming visit windows.",
      priority: "later",
      status: "planned",
      acceptanceCriteria: [],
    },
  ],
  users: [
    {
      id: "user-dispatcher",
      name: "Dispatcher",
      description: "Coordinates technician schedules and customer windows.",
      goals: ["Assign visits without conflicts"],
      permissions: ["manage-visits", "view-technicians"],
    },
    {
      id: "user-technician",
      name: "Technician",
      description: "Completes assigned visits and records work notes.",
      goals: ["See today's route", "Close visits on site"],
      permissions: ["view-own-visits", "update-visit-notes"],
    },
  ],
  stack: {
    frontend: "React",
    backend: "Node.js",
    database: "PostgreSQL",
    authentication: "session cookies",
    hosting: "a VPS",
    additional: ["Redis"],
  },
  architecture: {
    style: "modular monolith",
    components: [
      {
        id: "component-web",
        name: "Web app",
        description: "Dispatcher and technician interface.",
      },
      {
        id: "component-api",
        name: "HTTP API",
        description: "Application commands and queries.",
      },
    ],
    externalServices: [
      {
        id: "service-sms",
        name: "SMS gateway",
        purpose: "Send visit reminders to customers.",
      },
    ],
    constraints: ["Keep the first release as a single deployable service."],
  },
  database: {
    entities: [
      {
        id: "entity-visit",
        name: "Visit",
        description: "A scheduled technician visit to a customer site.",
      },
      {
        id: "entity-technician",
        name: "Technician",
        description: "A person who can be assigned visits.",
      },
    ],
    relationships: [
      {
        from: "entity-visit",
        to: "entity-technician",
        type: "many-to-one",
        description: "Each visit is assigned to one technician.",
      },
    ],
    constraints: ["A technician cannot have two overlapping visits."],
  },
  api: {
    endpoints: [
      {
        method: "GET",
        path: "/visits",
        purpose: "List visits visible to the current user.",
        authRequired: true,
      },
      {
        method: "POST",
        path: "/visits",
        purpose: "Create a visit assignment.",
        authRequired: true,
      },
    ],
  },
  security: {
    authentication: ["Users sign in with email and password."],
    authorization: ["Technicians can only update their own visits."],
    sensitiveData: ["Customer addresses", "Phone numbers"],
    constraints: ["Do not store payment card numbers."],
  },
  constraints: {
    budget: "One engineer for the first release.",
    deployment: ["Must run as a single service."],
    technology: ["Avoid introducing a second application runtime."],
    compliance: ["Treat customer contact details as personal data."],
    scope: ["No billing or invoicing in the first release."],
  },
  aiRules: [
    {
      id: "rule-core-purity",
      title: "Keep domain logic framework-free",
      priority: "must",
      activationMode: "always",
      description: "Applies to all generated application code.",
      body: "Do not import UI or HTTP frameworks from domain modules.",
      rationale: "The specification must stay portable across tools.",
    },
    {
      id: "rule-api-handlers",
      title: "Keep route handlers thin",
      priority: "should",
      activationMode: "scoped",
      globs: ["src/**/api/**"],
      body: "Route handlers should validate input and call application services.",
      rationale: "Prevents transport details from leaking into domain rules.",
    },
    {
      id: "rule-manual-review",
      title: "Review security-sensitive edits",
      priority: "must",
      activationMode: "manual",
      body: "Ask for explicit review before changing authentication or authorization.",
      rationale: "These changes are easy to get silently wrong.",
    },
  ],
} as const satisfies ProjectSpec;

describe("ProjectSpecSchema", () => {
  it("accepts a minimal valid ProjectSpec", () => {
    const result = ProjectSpecSchema.safeParse(minimalSpec);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual(minimalSpec);
    expect(result.data.features).toBeUndefined();
    expect(result.data.aiRules).toBeUndefined();
  });

  it("accepts a realistic full ProjectSpec", () => {
    const result = ProjectSpecSchema.safeParse(fullSpec);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual(fullSpec);
  });

  it("returns the expected typed structure after a successful parse", () => {
    const result = ProjectSpecSchema.safeParse(fullSpec);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const spec: ProjectSpec = result.data;

    expect(spec.project.name).toBe("FieldKit");
    expect(spec.project.status).toBe("ready");
    expect(spec.features?.[0]?.priority).toBe("must");
    expect(spec.api?.endpoints[0]?.method).toBe("GET");
    expect(spec.aiRules?.[1]?.activationMode).toBe("scoped");
  });

  it("rejects missing required project fields", () => {
    const result = ProjectSpecSchema.safeParse({
      project: {
        description: minimalProject.description,
        problem: minimalProject.problem,
        targetUsers: minimalProject.targetUsers,
        type: minimalProject.type,
        status: minimalProject.status,
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) => issue.path.join(".") === "project.name")).toBe(
      true,
    );
  });

  it("rejects a missing project section", () => {
    const result = ProjectSpecSchema.safeParse({});

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues.some((issue) => issue.path.join(".") === "project")).toBe(
      true,
    );
  });

  it("rejects empty required strings", () => {
    const result = ProjectSpecSchema.safeParse({
      project: {
        ...minimalProject,
        name: "   ",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid feature priority", () => {
    const result = ProjectSpecSchema.safeParse({
      project: minimalProject,
      features: [
        {
          id: "feature-board",
          name: "Board",
          description: "Show assigned work.",
          priority: "nice-to-have",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some((issue) => issue.path.join(".") === "features.0.priority"),
    ).toBe(true);
  });

  it("rejects an invalid feature status", () => {
    const result = ProjectSpecSchema.safeParse({
      project: minimalProject,
      features: [
        {
          id: "feature-board",
          name: "Board",
          description: "Show assigned work.",
          priority: "must",
          status: "in-progress",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some((issue) => issue.path.join(".") === "features.0.status"),
    ).toBe(true);
  });

  it("rejects an invalid AI rule activation mode", () => {
    const result = ProjectSpecSchema.safeParse({
      project: minimalProject,
      aiRules: [
        {
          id: "rule-style",
          title: "Follow the house style",
          priority: "must",
          activationMode: "on-demand",
          body: "Match existing naming.",
          rationale: "Keeps generated files consistent.",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some(
        (issue) => issue.path.join(".") === "aiRules.0.activationMode",
      ),
    ).toBe(true);
  });

  it("rejects an invalid API HTTP method", () => {
    const result = ProjectSpecSchema.safeParse({
      project: minimalProject,
      api: {
        endpoints: [
          {
            method: "FETCH",
            path: "/visits",
            purpose: "List visits.",
            authRequired: true,
          },
        ],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(
      result.error.issues.some((issue) => issue.path.join(".") === "api.endpoints.0.method"),
    ).toBe(true);
  });

  it("rejects invalid nested structures", () => {
    const missingFeatureName = ProjectSpecSchema.safeParse({
      project: minimalProject,
      features: [
        {
          id: "feature-board",
          description: "Show assigned work.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
    });
    const invalidPath = ProjectSpecSchema.safeParse({
      project: minimalProject,
      api: {
        endpoints: [
          {
            method: "GET",
            path: "visits",
            purpose: "List visits.",
            authRequired: true,
          },
        ],
      },
    });
    const scopedRuleWithoutGlobs = ProjectSpecSchema.safeParse({
      project: minimalProject,
      aiRules: [
        {
          id: "rule-api",
          title: "Keep handlers thin",
          priority: "should",
          activationMode: "scoped",
          body: "Do not put domain rules in route files.",
          rationale: "Route files should stay replaceable.",
        },
      ],
    });
    const duplicateFeatureIds = ProjectSpecSchema.safeParse({
      project: minimalProject,
      features: [
        {
          id: "feature-board",
          name: "Board",
          description: "Show assigned work.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
        {
          id: "feature-board",
          name: "Calendar",
          description: "Show the week view.",
          priority: "should",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(missingFeatureName.success).toBe(false);
    expect(invalidPath.success).toBe(false);
    expect(scopedRuleWithoutGlobs.success).toBe(false);
    expect(duplicateFeatureIds.success).toBe(false);
  });

  it("allows optional sections to be omitted", () => {
    const result = ProjectSpecSchema.safeParse(minimalSpec);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      project: minimalProject,
    });
    expect("goals" in result.data).toBe(false);
    expect("stack" in result.data).toBe(false);
    expect("database" in result.data).toBe(false);
  });
});
