import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { toSafeClaudeFilename } from "./filename";
import { renderClaudeCode } from "./renderer";

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
    additional: ["Redis", "BullMQ"],
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

function filePaths(result: ReturnType<typeof renderClaudeCode>): string[] {
  return result.files.map((file) => file.path);
}

function fileByPath(
  result: ReturnType<typeof renderClaudeCode>,
  path: string,
) {
  const file = result.files.find((entry) => entry.path === path);

  if (!file) {
    throw new Error(`Missing rendered file: ${path}`);
  }

  return file;
}

describe("renderClaudeCode", () => {
  it("renders only CLAUDE.md for a minimal ProjectSpec", () => {
    const result = renderClaudeCode(minimalSpec);

    expect(filePaths(result)).toEqual(["CLAUDE.md"]);
    const project = fileByPath(result, "CLAUDE.md").content;
    expect(project).toContain("# Project");
    expect(project).toContain("## Name\n\nNotebook");
    expect(project).toContain("## Description\n\nA personal notebook for capturing ideas.");
    expect(project).toContain("## Problem\n\nIdeas are lost across scattered notes.");
    expect(project).toContain("- Individual writers");
    expect(project).toContain("## Type\n\nweb application");
    expect(project).toContain("## Status\n\ndraft");
    expect(project).not.toContain("\n---\n");
    expect(project).not.toContain(".mdc");
  });

  it("renders a full ProjectSpec into CLAUDE.md and modular .claude/rules files", () => {
    const result = renderClaudeCode(fullSpec);

    expect(filePaths(result)).toEqual([
      "CLAUDE.md",
      ".claude/rules/goals.md",
      ".claude/rules/features.md",
      ".claude/rules/users.md",
      ".claude/rules/technology-stack.md",
      ".claude/rules/architecture.md",
      ".claude/rules/database.md",
      ".claude/rules/api.md",
      ".claude/rules/security.md",
      ".claude/rules/constraints.md",
      ".claude/rules/ai-rules/rule-core-purity.md",
      ".claude/rules/ai-rules/rule-api-handlers.md",
      ".claude/rules/ai-rules/rule-manual-review.md",
      ".claude/rules/ai-rules/rule-agent-style.md",
    ]);
  });

  it("renders goals, features, users, and stack content", () => {
    const result = renderClaudeCode(fullSpec);

    expect(fileByPath(result, ".claude/rules/goals.md").content).toContain(
      "- **goal-schedule-visits:** Let dispatchers assign visits without double-booking technicians.",
    );
    expect(fileByPath(result, ".claude/rules/goals.md").content).toContain(
      "- A dispatcher can assign a visit in under two minutes.",
    );

    const features = fileByPath(result, ".claude/rules/features.md").content;
    expect(features).toContain("### Visit board");
    expect(features).toContain("**ID:** feature-visit-board");
    expect(features).toContain("**Priority:** must");
    expect(features).toContain("**Status:** approved");
    expect(features).toContain("#### Acceptance Criteria");
    expect(features).toContain("- The board lists each visit assigned for the current day.");

    const users = fileByPath(result, ".claude/rules/users.md").content;
    expect(users).toContain("**ID:** user-dispatcher");
    expect(users).toContain("- Assign visits without conflicts");
    expect(users).toContain("- manage-visits");

    const stack = fileByPath(result, ".claude/rules/technology-stack.md").content;
    expect(stack).toContain("## Frontend\n\nReact");
    expect(stack).toContain("## Backend\n\nNode.js");
    expect(stack).toContain("- Redis");
    expect(stack).toContain("- BullMQ");
    expect(stack.indexOf("- Redis")).toBeLessThan(stack.indexOf("- BullMQ"));
  });

  it("renders architecture, conceptual database, API, security, and constraints", () => {
    const result = renderClaudeCode(fullSpec);

    const architecture = fileByPath(result, ".claude/rules/architecture.md").content;
    expect(architecture).toContain("## Style\n\nmodular monolith");
    expect(architecture).toContain("**ID:** component-web");
    expect(architecture).toContain("**ID:** service-sms");

    const database = fileByPath(result, ".claude/rules/database.md").content;
    expect(database).toContain("### Visit");
    expect(database).toContain("`entity-visit` → `entity-technician` (many-to-one):");
    expect(database).not.toContain("CREATE TABLE");
    expect(database).not.toContain("FOREIGN KEY");

    const api = fileByPath(result, ".claude/rules/api.md").content;
    expect(api).toContain("### `GET /visits`");
    expect(api).toContain("**Purpose:** List visits visible to the current user.");
    expect(api).toContain("**Authentication Required:** Yes");
    expect(api).toContain("**Authentication Required:** No");

    expect(fileByPath(result, ".claude/rules/security.md").content).toContain(
      "- Users sign in with email and password.",
    );
    expect(fileByPath(result, ".claude/rules/constraints.md").content).toContain(
      "## Budget\n\nOne engineer for the first release.",
    );
  });

  it("maps all four AI activation modes without inventing unsupported frontmatter", () => {
    const result = renderClaudeCode(fullSpec);
    const always = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-core-purity.md",
    ).content;
    const scoped = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-api-handlers.md",
    ).content;
    const manual = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-manual-review.md",
    ).content;
    const agentDecides = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-agent-style.md",
    ).content;

    expect(always.startsWith("# Keep domain logic framework-free")).toBe(true);
    expect(always).toContain("**Activation:** always");
    expect(always).not.toContain("\npaths:");

    expect(scoped).toContain("paths:");
    expect(scoped).toContain('  - "src/**/api/**"');
    expect(scoped).toContain('  - "src/app/**/route.ts"');
    expect(scoped).toContain("**Activation:** scoped");
    expect(scoped).not.toContain("alwaysApply:");
    expect(scoped).not.toContain("trigger:");
    expect(scoped).not.toContain("\nglobs:");

    expect(manual).toContain("**Activation:** manual");
    expect(manual).not.toContain("\npaths:");

    expect(agentDecides).toContain("**Activation:** agent_decides");
    expect(agentDecides).not.toContain("\npaths:");
    expect(agentDecides).not.toContain("model_decision");
  });

  it("preserves scoped globs in official paths frontmatter and in the body", () => {
    const scoped = fileByPath(
      renderClaudeCode(fullSpec),
      ".claude/rules/ai-rules/rule-api-handlers.md",
    ).content;

    expect(scoped).toMatch(/^---\npaths:\n  - "src\/\*\*\/api\/\*\*"\n  - "src\/app\/\*\*\/route\.ts"\n---\n/);
    expect(scoped).toContain("**Globs:**");
    expect(scoped).toContain("- src/**/api/**");
    expect(scoped).toContain("- src/app/**/route.ts");
  });

  it("preserves priority, description, and rationale", () => {
    const result = renderClaudeCode(fullSpec);
    const features = fileByPath(result, ".claude/rules/features.md").content;
    const always = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-core-purity.md",
    ).content;

    expect(features).toContain("**Priority:** must");
    expect(features).toContain("**Priority:** should");
    expect(features).toContain("**Priority:** later");
    expect(always).toContain("**Priority:** must");
    expect(always).toContain("Applies to all generated application code.");
    expect(always).toContain(
      "**Rationale:** The specification must stay portable across tools.",
    );
    expect(always).not.toContain("priority:");
  });

  it("preserves source order for features, users, endpoints, additional tech, and AI rules", () => {
    const result = renderClaudeCode(fullSpec);
    const features = fileByPath(result, ".claude/rules/features.md").content;
    const users = fileByPath(result, ".claude/rules/users.md").content;
    const api = fileByPath(result, ".claude/rules/api.md").content;

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
    expect(
      filePaths(result).filter((path) => path.startsWith(".claude/rules/ai-rules/")),
    ).toEqual([
      ".claude/rules/ai-rules/rule-core-purity.md",
      ".claude/rules/ai-rules/rule-api-handlers.md",
      ".claude/rules/ai-rules/rule-manual-review.md",
      ".claude/rules/ai-rules/rule-agent-style.md",
    ]);
  });

  it("omits empty or undefined optional sections", () => {
    expect(
      filePaths(
        renderClaudeCode({
          ...minimalSpec,
          stack: { frontend: "Svelte" },
        }),
      ),
    ).toEqual(["CLAUDE.md", ".claude/rules/technology-stack.md"]);

    expect(
      filePaths(
        renderClaudeCode({
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
        }),
      ),
    ).toEqual(["CLAUDE.md"]);
  });

  it("normalizes unsafe AI rule IDs and disambiguates collisions", () => {
    const result = renderClaudeCode({
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
        {
          id: "api-conventions",
          title: "Collision",
          priority: "later",
          activationMode: "always",
          body: "Disambiguate colliding names.",
          rationale: "Normalized IDs must stay unique.",
        },
      ],
    });

    expect(
      filePaths(result).filter((path) => path.startsWith(".claude/rules/ai-rules/")),
    ).toEqual([
      ".claude/rules/ai-rules/api-conventions.md",
      ".claude/rules/ai-rules/secret.md",
      ".claude/rules/ai-rules/foo.md",
      ".claude/rules/ai-rules/api-conventions-2.md",
    ]);
    expect(toSafeClaudeFilename("a\\b")).toBe("a-b.md");
    expect(toSafeClaudeFilename("..")).toBe("rule.md");
  });

  it("keeps special characters and multiline content readable", () => {
    const result = renderClaudeCode({
      project: {
        name: "Pipe | Hash # Star * Under_score",
        description: "Line one.\nLine two with `code`.",
        problem: "Needs *emphasis* and _underscores_.",
        targetUsers: ["Owners | staff"],
        type: "SaaS",
        status: "draft",
      },
      aiRules: [
        {
          id: "rule-special",
          title: 'Title: "quoted" and: colon',
          priority: "must",
          activationMode: "scoped",
          globs: ['src/**/*.{ts,tsx}', 'docs/[draft]/**'],
          description: 'Rule: keep `code` and "quotes"',
          body: "Allow `|`, #, /, \\, and [brackets] in content.",
          rationale: "Users may write Markdown.",
        },
      ],
    });

    const project = fileByPath(result, "CLAUDE.md").content;
    const rule = fileByPath(
      result,
      ".claude/rules/ai-rules/rule-special.md",
    ).content;

    expect(project).toContain("Pipe | Hash # Star * Under_score");
    expect(project).toContain("Line two with `code`.");
    expect(rule).toContain('  - "src/**/*.{ts,tsx}"');
    expect(rule).toContain("Allow `|`, #, /, \\, and [brackets] in content.");
    expect(rule).toContain('Rule: keep `code` and "quotes"');
  });

  it("is deterministic, immutable, and free of empty or accidental values", () => {
    const spec: ProjectSpec = structuredClone(fullSpec);
    const snapshot = structuredClone(spec);
    const first = renderClaudeCode(spec);

    expect(spec).toEqual(snapshot);
    expect(first).toEqual(renderClaudeCode(fullSpec));

    for (const file of first.files) {
      const body = file.content.replace(/^---[\s\S]*?---\s*/, "").trim();
      expect(body.length).toBeGreaterThan(0);
      expect(file.content.endsWith("\n")).toBe(true);
      expect(file.content.endsWith("\n\n")).toBe(false);
      expect(file.content).not.toMatch(/undefined|null|\[object Object\]/);
      expect(file.content).not.toContain("N/A");
    }
  });
});
