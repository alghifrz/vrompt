import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { toSafeQoderFilename } from "./filename";
import { serializeYamlScalar } from "./frontmatter";
import { renderQoder } from "./renderer";

const minimalSpec = {
  project: {
    name: "Notebook",
    description: "A personal notebook for capturing ideas.",
    problem: "Ideas are lost across scattered notes.",
    targetUsers: ["Individual writers"],
    type: "web application",
    status: "draft",
  },
} as const satisfies ProjectSpec;

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
      ],
    },
    {
      id: "feature-offline-notes",
      name: "Offline notes",
      description: "Allow technicians to draft visit notes without a network.",
      priority: "should",
      status: "planned",
      acceptanceCriteria: [],
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
      permissions: ["manage-visits"],
    },
    {
      id: "user-technician",
      name: "Technician",
      description: "Completes assigned visits and records work notes.",
      goals: ["See today's route"],
      permissions: ["view-own-visits"],
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
      {
        method: "DELETE",
        path: "/visits/:id",
        purpose: "Cancel a visit.",
        authRequired: false,
      },
    ],
  },
  security: {
    authentication: ["Users sign in with email and password."],
    authorization: ["Technicians can only update their own visits."],
    sensitiveData: ["Customer addresses"],
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
      globs: ["src/**/api/**", "src/app/**/route.ts"],
      body: "Route handlers should validate input and call application services.",
      rationale: "Prevents transport details from leaking into domain rules.",
    },
    {
      id: "rule-manual-review",
      title: "Review security-sensitive edits",
      priority: "later",
      activationMode: "manual",
      body: "Ask for explicit review before changing authentication.",
      rationale: "These changes are easy to get silently wrong.",
    },
    {
      id: "rule-agent-style",
      title: "Prefer existing naming",
      priority: "should",
      activationMode: "agent_decides",
      description: "Use when a change is stylistic rather than behavioral.",
      body: "Match local naming when the change is stylistic.",
      rationale: "Style nits should not block delivery.",
    },
  ],
} as const satisfies ProjectSpec;

function filePaths(result: ReturnType<typeof renderQoder>): string[] {
  return result.files.map((file) => file.path);
}

function fileByPath(result: ReturnType<typeof renderQoder>, path: string) {
  const file = result.files.find((entry) => entry.path === path);

  if (!file) {
    throw new Error(`Missing rendered file: ${path}`);
  }

  return file;
}

describe("renderQoder", () => {
  it("renders only the project rule for a minimal ProjectSpec", () => {
    const result = renderQoder(minimalSpec);

    expect(filePaths(result)).toEqual([".qoder/rules/project.md"]);
    const project = fileByPath(result, ".qoder/rules/project.md").content;
    expect(project).toContain("trigger: always_on");
    expect(project).toContain("# Project");
    expect(project).toContain("## Name\n\nNotebook");
    expect(project).toContain("## Status\n\ndraft");
    expect(project).toContain("- Individual writers");
    expect(project).not.toContain(".mdc");
  });

  it("renders a full ProjectSpec into Qoder rule files", () => {
    const result = renderQoder(fullSpec);

    expect(filePaths(result)).toEqual([
      ".qoder/rules/project.md",
      ".qoder/rules/goals.md",
      ".qoder/rules/features.md",
      ".qoder/rules/users.md",
      ".qoder/rules/technology-stack.md",
      ".qoder/rules/architecture.md",
      ".qoder/rules/database.md",
      ".qoder/rules/api.md",
      ".qoder/rules/security.md",
      ".qoder/rules/constraints.md",
      ".qoder/rules/ai-rules/rule-core-purity.md",
      ".qoder/rules/ai-rules/rule-api-handlers.md",
      ".qoder/rules/ai-rules/rule-manual-review.md",
      ".qoder/rules/ai-rules/rule-agent-style.md",
    ]);

    const features = fileByPath(result, ".qoder/rules/features.md").content;
    expect(features).toContain("trigger: always_on");
    expect(features).toContain("### Visit board");
    expect(features).toContain("**Priority:** must");

    const database = fileByPath(result, ".qoder/rules/database.md").content;
    expect(database).toContain("### Visit");
    expect(database).not.toContain("CREATE TABLE");
    expect(database).not.toContain("openapi");

    expect(fileByPath(result, ".qoder/rules/technology-stack.md").content).toContain(
      "## Frontend\n\nReact",
    );
  });

  it("omits files for undefined optional sections", () => {
    const result = renderQoder({
      ...minimalSpec,
      stack: { frontend: "Svelte" },
    });

    expect(filePaths(result)).toEqual([
      ".qoder/rules/project.md",
      ".qoder/rules/technology-stack.md",
    ]);
    expect(filePaths(result).some((path) => path.includes("goals"))).toBe(false);
    expect(filePaths(result).some((path) => path.includes("database"))).toBe(false);
  });

  it("does not generate files for empty collections or empty objects", () => {
    const result = renderQoder({
      ...minimalSpec,
      goals: { primary: [], successCriteria: [] },
      features: [],
      users: [],
      stack: {},
      architecture: {},
      database: {},
      api: { endpoints: [] },
      security: {},
      constraints: {},
      aiRules: [],
    });

    expect(filePaths(result)).toEqual([".qoder/rules/project.md"]);
  });

  it("preserves source order for features, users, API endpoints, and AI rules", () => {
    const result = renderQoder(fullSpec);
    const features = fileByPath(result, ".qoder/rules/features.md").content;
    const users = fileByPath(result, ".qoder/rules/users.md").content;
    const api = fileByPath(result, ".qoder/rules/api.md").content;
    const aiRulePaths = filePaths(result).filter((path) =>
      path.startsWith(".qoder/rules/ai-rules/"),
    );

    expect(features.indexOf("### Visit board")).toBeLessThan(
      features.indexOf("### Offline notes"),
    );
    expect(features.indexOf("### Offline notes")).toBeLessThan(
      features.indexOf("### Customer portal"),
    );
    expect(users.indexOf("### Dispatcher")).toBeLessThan(
      users.indexOf("### Technician"),
    );
    expect(api.indexOf("### `GET /visits`")).toBeLessThan(
      api.indexOf("### `POST /visits`"),
    );
    expect(api.indexOf("### `POST /visits`")).toBeLessThan(
      api.indexOf("### `DELETE /visits/:id`"),
    );
    expect(aiRulePaths).toEqual([
      ".qoder/rules/ai-rules/rule-core-purity.md",
      ".qoder/rules/ai-rules/rule-api-handlers.md",
      ".qoder/rules/ai-rules/rule-manual-review.md",
      ".qoder/rules/ai-rules/rule-agent-style.md",
    ]);
  });

  it("maps each AI activation mode to supported Qoder frontmatter", () => {
    const result = renderQoder(fullSpec);
    const always = fileByPath(
      result,
      ".qoder/rules/ai-rules/rule-core-purity.md",
    ).content;
    const scoped = fileByPath(
      result,
      ".qoder/rules/ai-rules/rule-api-handlers.md",
    ).content;
    const manual = fileByPath(
      result,
      ".qoder/rules/ai-rules/rule-manual-review.md",
    ).content;
    const agentDecides = fileByPath(
      result,
      ".qoder/rules/ai-rules/rule-agent-style.md",
    ).content;

    expect(always).toContain("trigger: always_on");
    expect(always).toContain("**Activation:** always");

    expect(scoped).toContain("trigger: glob");
    expect(scoped).toContain("glob:");
    expect(scoped).toContain("**Activation:** scoped");

    expect(manual).toContain("trigger: manual");
    expect(manual).toContain("**Activation:** manual");

    expect(agentDecides).toContain("trigger: model_decision");
    expect(agentDecides).toContain(
      "description: Use when a change is stylistic rather than behavioral.",
    );
    expect(agentDecides).toContain("**Activation:** agent_decides");
  });

  it("represents scoped globs in native frontmatter and in rule content", () => {
    const scoped = fileByPath(
      renderQoder(fullSpec),
      ".qoder/rules/ai-rules/rule-api-handlers.md",
    ).content;

    expect(scoped).toContain('  - "src/**/api/**"');
    expect(scoped).toContain('  - "src/app/**/route.ts"');
    expect(scoped).toContain("- src/**/api/**");
    expect(scoped).toContain("- src/app/**/route.ts");
  });

  it("preserves must, should, and later priorities in rule content", () => {
    const result = renderQoder(fullSpec);
    const features = fileByPath(result, ".qoder/rules/features.md").content;

    expect(features).toContain("**Priority:** must");
    expect(features).toContain("**Priority:** should");
    expect(features).toContain("**Priority:** later");
    expect(
      fileByPath(result, ".qoder/rules/ai-rules/rule-core-purity.md").content,
    ).toContain("**Priority:** must");
    expect(
      fileByPath(result, ".qoder/rules/ai-rules/rule-api-handlers.md").content,
    ).toContain("**Priority:** should");
    expect(
      fileByPath(result, ".qoder/rules/ai-rules/rule-manual-review.md").content,
    ).toContain("**Priority:** later");
  });

  it("keeps special characters readable in Markdown and quoted in YAML", () => {
    const result = renderQoder({
      project: {
        name: "Pipe | Hash # Star * Under_score",
        description: "Line one.\nLine two with `code`.",
        problem: "Needs *emphasis* and _underscores_.",
        targetUsers: ["Owners | staff"],
        type: "SaaS",
        status: "draft",
      },
      stack: {
        frontend: "Next.js | React",
      },
      aiRules: [
        {
          id: "rule-special",
          title: 'Title: "quoted" and: colon',
          priority: "must",
          activationMode: "agent_decides",
          description: 'Rule: keep `code` and "quotes"',
          body: "Allow `|`, #, /, and \\ in content.",
          rationale: "Users may write Markdown.",
        },
      ],
    });

    const project = fileByPath(result, ".qoder/rules/project.md").content;
    const rule = fileByPath(
      result,
      ".qoder/rules/ai-rules/rule-special.md",
    ).content;

    expect(project).toContain("Pipe | Hash # Star * Under_score");
    expect(project).toContain("Line two with `code`.");
    expect(rule).toContain(
      `description: ${serializeYamlScalar('Rule: keep `code` and "quotes"')}`,
    );
    expect(rule).toContain("Allow `|`, #, /, and \\ in content.");
  });

  it("is deterministic for the same ProjectSpec", () => {
    expect(renderQoder(fullSpec)).toEqual(renderQoder(fullSpec));
  });

  it("does not mutate the input ProjectSpec", () => {
    const spec: ProjectSpec = structuredClone(fullSpec);
    const snapshot = structuredClone(spec);

    renderQoder(spec);

    expect(spec).toEqual(snapshot);
  });

  it("does not generate empty files", () => {
    for (const file of renderQoder(fullSpec).files) {
      const body = file.content.replace(/^---[\s\S]*?---\s*/, "").trim();
      expect(body.length).toBeGreaterThan(0);
      expect(file.content).not.toContain("N/A");
      expect(file.content).not.toContain("Unknown");
    }
  });

  it("ends every generated file with exactly one newline", () => {
    for (const file of renderQoder(fullSpec).files) {
      expect(file.content.endsWith("\n")).toBe(true);
      expect(file.content.endsWith("\n\n")).toBe(false);
    }
  });

  it("does not emit undefined, null, or object artifacts", () => {
    for (const file of renderQoder(fullSpec).files) {
      expect(file.content).not.toMatch(/undefined|null|\[object Object\]/);
    }
  });

  it("normalizes unsafe AI rule IDs into safe Qoder filenames", () => {
    const result = renderQoder({
      ...minimalSpec,
      aiRules: [
        {
          id: "api/conventions",
          title: "API conventions",
          priority: "should",
          activationMode: "always",
          body: "Keep handlers thin.",
          rationale: "Routes stay replaceable.",
        },
        {
          id: "../secret",
          title: "No traversal",
          priority: "must",
          activationMode: "always",
          body: "Ignore path traversal in IDs.",
          rationale: "Filenames must stay inside the rules directory.",
        },
        {
          id: "foo.md",
          title: "Already extended",
          priority: "must",
          activationMode: "always",
          body: "Do not double the extension.",
          rationale: "The renderer appends .md once.",
        },
      ],
    });

    expect(
      filePaths(result).filter((path) => path.startsWith(".qoder/rules/ai-rules/")),
    ).toEqual([
      ".qoder/rules/ai-rules/api-conventions.md",
      ".qoder/rules/ai-rules/secret.md",
      ".qoder/rules/ai-rules/foo.md",
    ]);
    expect(toSafeQoderFilename("a\\b")).toBe("a-b.md");
  });
});
