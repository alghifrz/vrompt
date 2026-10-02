import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { toSafeRuleFilename } from "./filename";
import { serializeYamlScalar } from "./frontmatter";
import { renderCursor } from "./renderer";

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
      body: "Match local naming when the change is stylistic.",
      rationale: "Style nits should not block delivery.",
    },
  ],
} as const satisfies ProjectSpec;

function filePaths(result: ReturnType<typeof renderCursor>): string[] {
  return result.files.map((file) => file.path);
}

function fileByPath(
  result: ReturnType<typeof renderCursor>,
  path: string,
) {
  const file = result.files.find((entry) => entry.path === path);

  if (!file) {
    throw new Error(`Missing rendered file: ${path}`);
  }

  return file;
}

describe("renderCursor", () => {
  it("renders only the project overview for a minimal ProjectSpec", () => {
    const result = renderCursor(minimalSpec);

    expect(filePaths(result)).toEqual([".cursor/rules/project-overview.mdc"]);
    const overview = fileByPath(result, ".cursor/rules/project-overview.mdc").content;
    expect(overview).toContain("alwaysApply: true");
    expect(overview).toContain("description: Project overview and core project context");
    expect(overview).toContain("# Project Overview");
    expect(overview).toContain("## Name\n\nNotebook");
    expect(overview).toContain("## Status\n\ndraft");
    expect(overview).toContain("- Individual writers");
  });

  it("renders a full ProjectSpec into the expected Cursor files", () => {
    const result = renderCursor(fullSpec);
    const paths = filePaths(result);

    expect(paths).toEqual([
      ".cursor/rules/project-overview.mdc",
      ".cursor/rules/goals.mdc",
      ".cursor/rules/features.mdc",
      ".cursor/rules/users.mdc",
      ".cursor/rules/technology-stack.mdc",
      ".cursor/rules/architecture.mdc",
      ".cursor/rules/database.mdc",
      ".cursor/rules/api.mdc",
      ".cursor/rules/security.mdc",
      ".cursor/rules/constraints.mdc",
      ".cursor/rules/ai-rules/rule-core-purity.mdc",
      ".cursor/rules/ai-rules/rule-api-handlers.mdc",
      ".cursor/rules/ai-rules/rule-manual-review.mdc",
      ".cursor/rules/ai-rules/rule-agent-style.mdc",
    ]);

    const features = fileByPath(result, ".cursor/rules/features.mdc").content;
    expect(features).toContain("### Visit board");
    expect(features).toContain("**ID:** feature-visit-board");
    expect(features).toContain("**Priority:** must");
    expect(features).toContain("#### Acceptance Criteria");

    const database = fileByPath(result, ".cursor/rules/database.mdc").content;
    expect(database).toContain("### Visit");
    expect(database).toContain("`entity-visit` → `entity-technician` (many-to-one):");
    expect(database).not.toContain("CREATE TABLE");
    expect(database).not.toContain("SELECT");

    const stack = fileByPath(result, ".cursor/rules/technology-stack.mdc").content;
    expect(stack).toContain("## Frontend\n\nReact");
    expect(stack).toContain("- Redis");
  });

  it("omits files for undefined optional sections", () => {
    const result = renderCursor({
      ...minimalSpec,
      stack: { frontend: "Svelte" },
    });

    expect(filePaths(result)).toEqual([
      ".cursor/rules/project-overview.mdc",
      ".cursor/rules/technology-stack.mdc",
    ]);
    expect(filePaths(result).some((path) => path.includes("goals"))).toBe(false);
    expect(filePaths(result).some((path) => path.includes("database"))).toBe(false);
  });

  it("does not generate files for empty collections or empty objects", () => {
    const result = renderCursor({
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

    expect(filePaths(result)).toEqual([".cursor/rules/project-overview.mdc"]);
  });

  it("returns files in the required deterministic order", () => {
    expect(filePaths(renderCursor(fullSpec))).toEqual([
      ".cursor/rules/project-overview.mdc",
      ".cursor/rules/goals.mdc",
      ".cursor/rules/features.mdc",
      ".cursor/rules/users.mdc",
      ".cursor/rules/technology-stack.mdc",
      ".cursor/rules/architecture.mdc",
      ".cursor/rules/database.mdc",
      ".cursor/rules/api.mdc",
      ".cursor/rules/security.mdc",
      ".cursor/rules/constraints.mdc",
      ".cursor/rules/ai-rules/rule-core-purity.mdc",
      ".cursor/rules/ai-rules/rule-api-handlers.mdc",
      ".cursor/rules/ai-rules/rule-manual-review.mdc",
      ".cursor/rules/ai-rules/rule-agent-style.mdc",
    ]);
  });

  it("preserves feature order from the source spec", () => {
    const features = fileByPath(renderCursor(fullSpec), ".cursor/rules/features.mdc")
      .content;
    expect(features.indexOf("### Visit board")).toBeLessThan(
      features.indexOf("### Offline notes"),
    );
    expect(features.indexOf("### Offline notes")).toBeLessThan(
      features.indexOf("### Customer portal"),
    );
  });

  it("preserves API endpoint order from the source spec", () => {
    const api = fileByPath(renderCursor(fullSpec), ".cursor/rules/api.mdc").content;
    expect(api.indexOf("### `GET /visits`")).toBeLessThan(
      api.indexOf("### `POST /visits`"),
    );
    expect(api.indexOf("### `POST /visits`")).toBeLessThan(
      api.indexOf("### `DELETE /visits/:id`"),
    );
    expect(api).toContain("**Authentication Required:** No");
  });

  it("preserves AI rule order from the source spec", () => {
    const paths = filePaths(renderCursor(fullSpec)).filter((path) =>
      path.startsWith(".cursor/rules/ai-rules/"),
    );

    expect(paths).toEqual([
      ".cursor/rules/ai-rules/rule-core-purity.mdc",
      ".cursor/rules/ai-rules/rule-api-handlers.mdc",
      ".cursor/rules/ai-rules/rule-manual-review.mdc",
      ".cursor/rules/ai-rules/rule-agent-style.mdc",
    ]);
  });

  it("maps each AI activation mode to supported Cursor frontmatter", () => {
    const result = renderCursor(fullSpec);
    const always = fileByPath(
      result,
      ".cursor/rules/ai-rules/rule-core-purity.mdc",
    ).content;
    const scoped = fileByPath(
      result,
      ".cursor/rules/ai-rules/rule-api-handlers.mdc",
    ).content;
    const manual = fileByPath(
      result,
      ".cursor/rules/ai-rules/rule-manual-review.mdc",
    ).content;
    const agentDecides = fileByPath(
      result,
      ".cursor/rules/ai-rules/rule-agent-style.mdc",
    ).content;

    expect(always).toContain("alwaysApply: true");
    expect(always).not.toContain("\nglobs:");
    expect(always).toContain("**Activation:** always");

    expect(scoped).toContain("alwaysApply: false");
    expect(scoped).toContain("globs:");
    expect(scoped).toContain("**Activation:** scoped");

    expect(manual).toContain("alwaysApply: false");
    expect(manual).not.toContain("\nglobs:");
    expect(manual).toContain("**Activation:** manual");

    expect(agentDecides).toContain("alwaysApply: false");
    expect(agentDecides).not.toContain("\nglobs:");
    expect(agentDecides).toContain("**Activation:** agent_decides");
    expect(agentDecides).not.toContain("activationMode: agent_decides");
  });

  it("includes every scoped glob in frontmatter and body", () => {
    const scoped = fileByPath(
      renderCursor(fullSpec),
      ".cursor/rules/ai-rules/rule-api-handlers.mdc",
    ).content;

    expect(scoped).toContain('  - "src/**/api/**"');
    expect(scoped).toContain('  - "src/app/**/route.ts"');
    expect(scoped).toContain("- src/**/api/**");
    expect(scoped).toContain("- src/app/**/route.ts");
  });

  it("preserves must, should, and later priorities", () => {
    const result = renderCursor(fullSpec);
    const features = fileByPath(result, ".cursor/rules/features.mdc").content;

    expect(features).toContain("**Priority:** must");
    expect(features).toContain("**Priority:** should");
    expect(features).toContain("**Priority:** later");
    expect(
      fileByPath(result, ".cursor/rules/ai-rules/rule-core-purity.mdc").content,
    ).toContain("**Priority:** must");
    expect(
      fileByPath(result, ".cursor/rules/ai-rules/rule-api-handlers.mdc").content,
    ).toContain("**Priority:** should");
    expect(
      fileByPath(result, ".cursor/rules/ai-rules/rule-manual-review.mdc").content,
    ).toContain("**Priority:** later");
  });

  it("serializes special characters safely in frontmatter and Markdown", () => {
    const result = renderCursor({
      project: {
        name: "Pipe | Hash # Star * Under_score",
        description: 'Project: A "modern" app\nSecond line.',
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
          activationMode: "always",
          description: 'Rule: keep `code` and "quotes"',
          body: "Allow `|` and # headings in content.",
          rationale: "Users may write Markdown.",
        },
      ],
    });

    const overview = fileByPath(result, ".cursor/rules/project-overview.mdc").content;
    const rule = fileByPath(
      result,
      ".cursor/rules/ai-rules/rule-special.mdc",
    ).content;

    expect(overview).toContain("Pipe | Hash # Star * Under_score");
    expect(overview).toContain("Second line.");
    expect(rule).toContain(
      `description: ${serializeYamlScalar('Rule: keep `code` and "quotes"')}`,
    );
    expect(rule).toContain("Allow `|` and # headings in content.");
    expect(rule).not.toContain("description: Rule: keep");
  });

  it("normalizes unsafe AI rule IDs into safe filenames", () => {
    const result = renderCursor({
      ...minimalSpec,
      aiRules: [
        {
          id: "typescript-strict",
          title: "Strict TypeScript",
          priority: "must",
          activationMode: "always",
          body: "Use strict TypeScript.",
          rationale: "Catch type errors early.",
        },
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
          id: "my rule!",
          title: "Spaced id",
          priority: "later",
          activationMode: "always",
          body: "Normalize punctuation.",
          rationale: "Keep names readable.",
        },
        {
          id: "foo.mdc",
          title: "Already extended",
          priority: "must",
          activationMode: "always",
          body: "Do not double the extension.",
          rationale: "The renderer appends .mdc once.",
        },
        {
          id: "..",
          title: "Empty after cleanup",
          priority: "must",
          activationMode: "always",
          body: "Fallback when nothing safe remains.",
          rationale: "Avoid empty filenames.",
        },
        {
          id: "api-conventions",
          title: "Collision",
          priority: "should",
          activationMode: "always",
          body: "Disambiguate colliding names.",
          rationale: "Normalized IDs must stay unique.",
        },
      ],
    });

    expect(
      filePaths(result).filter((path) => path.startsWith(".cursor/rules/ai-rules/")),
    ).toEqual([
      ".cursor/rules/ai-rules/typescript-strict.mdc",
      ".cursor/rules/ai-rules/api-conventions.mdc",
      ".cursor/rules/ai-rules/secret.mdc",
      ".cursor/rules/ai-rules/my-rule.mdc",
      ".cursor/rules/ai-rules/foo.mdc",
      ".cursor/rules/ai-rules/rule.mdc",
      ".cursor/rules/ai-rules/api-conventions-2.mdc",
    ]);
    expect(toSafeRuleFilename("../secret")).toBe("secret.mdc");
    expect(toSafeRuleFilename("a\\b")).toBe("a-b.mdc");
  });

  it("is deterministic for the same ProjectSpec", () => {
    expect(renderCursor(fullSpec)).toEqual(renderCursor(fullSpec));
  });

  it("does not mutate the input ProjectSpec", () => {
    const spec: ProjectSpec = structuredClone(fullSpec);
    const snapshot = structuredClone(spec);

    renderCursor(spec);

    expect(spec).toEqual(snapshot);
  });

  it("does not generate empty files", () => {
    for (const file of renderCursor(fullSpec).files) {
      const body = file.content.replace(/^---[\s\S]*?---\s*/, "").trim();
      expect(body.length).toBeGreaterThan(0);
      expect(file.content).not.toContain("N/A");
      expect(file.content).not.toContain("Unknown");
      expect(file.content).not.toContain("Not specified");
    }
  });

  it("ends every generated file with exactly one newline", () => {
    for (const file of renderCursor(fullSpec).files) {
      expect(file.content.endsWith("\n")).toBe(true);
      expect(file.content.endsWith("\n\n")).toBe(false);
    }
  });

  it("does not emit undefined, null, or object artifacts", () => {
    for (const file of renderCursor(fullSpec).files) {
      expect(file.content).not.toMatch(/undefined|null|\[object Object\]/);
    }
  });
});
