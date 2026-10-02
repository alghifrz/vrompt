import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { renderAgentsMd } from "./renderer";

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
      {
        id: "goal-close-visits",
        statement: "Let technicians close visits from the field.",
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

const optionalSectionHeadings = [
  "## Goals",
  "## Features",
  "## Users",
  "## Technology Stack",
  "## Architecture",
  "## Database",
  "## API",
  "## Security",
  "## Constraints",
  "## AI Rules",
] as const;

function headingIndex(markdown: string, heading: string): number {
  return markdown.indexOf(`\n${heading}\n`);
}

describe("renderAgentsMd", () => {
  it("renders a minimal ProjectSpec with only the project overview", () => {
    const markdown = renderAgentsMd(minimalSpec);

    expect(markdown).toContain("# Project");
    expect(markdown).toContain("## Overview");
    expect(markdown).toContain("**Name:** Notebook");
    expect(markdown).toContain(
      "**Description:** A personal notebook for capturing ideas.",
    );
    expect(markdown).toContain(
      "**Problem:** Ideas are lost across scattered notes.",
    );
    expect(markdown).toContain("- Individual writers");
    expect(markdown).toContain("**Type:** web application");
    expect(markdown).toContain("**Status:** draft");

    for (const heading of optionalSectionHeadings) {
      expect(markdown).not.toContain(heading);
    }
  });

  it("renders a full ProjectSpec with every populated section", () => {
    const markdown = renderAgentsMd(fullSpec);

    expect(markdown).toContain("**Name:** FieldKit");
    expect(markdown).toContain("## Goals");
    expect(markdown).toContain("### Primary Goals");
    expect(markdown).toContain(
      "- **goal-schedule-visits:** Let dispatchers assign visits without double-booking technicians.",
    );
    expect(markdown).toContain("### Success Criteria");
    expect(markdown).toContain(
      "- A dispatcher can assign a visit in under two minutes.",
    );

    expect(markdown).toContain("### Feature: Visit board");
    expect(markdown).toContain("**ID:** feature-visit-board");
    expect(markdown).toContain("**Priority:** must");
    expect(markdown).toContain("**Status:** approved");
    expect(markdown).toContain("#### Acceptance Criteria");
    expect(markdown).not.toMatch(
      /### Feature: Customer portal[\s\S]*#### Acceptance Criteria/,
    );

    expect(markdown).toContain("### Dispatcher");
    expect(markdown).toContain("**ID:** user-dispatcher");
    expect(markdown).toContain("- Assign visits without conflicts");
    expect(markdown).toContain("- manage-visits");

    expect(markdown).toContain("| Frontend | React |");
    expect(markdown).toContain("| Backend | Node.js |");
    expect(markdown).toContain("### Additional Technologies");
    expect(markdown).toContain("- Redis");

    expect(markdown).toContain("**Style:** modular monolith");
    expect(markdown).toContain("**Web app** (`component-web`):");
    expect(markdown).toContain("**SMS gateway** (`service-sms`):");

    expect(markdown).toContain("**Visit** (`entity-visit`):");
    expect(markdown).toContain("`entity-visit` → `entity-technician` (many-to-one):");
    expect(markdown).not.toContain("SELECT");
    expect(markdown).not.toContain("CREATE TABLE");

    expect(markdown).toContain("### `GET /visits`");
    expect(markdown).toContain("**Authentication Required:** Yes");
    expect(markdown).toContain("### `DELETE /visits/:id`");
    expect(markdown).toContain("**Authentication Required:** No");

    expect(markdown).toContain("### Authentication");
    expect(markdown).toContain("- Users sign in with email and password.");
    expect(markdown).toContain("**Budget:** One engineer for the first release.");
    expect(markdown).toContain("### Scope");

    expect(markdown).toContain("### Rule: Keep domain logic framework-free");
    expect(markdown).toContain("**Activation:** always");
    expect(markdown).toContain("**Activation:** scoped");
    expect(markdown).toContain("**Activation:** manual");
    expect(markdown).not.toMatch(/undefined|null|\[object Object\]/);
  });

  it("omits undefined optional sections", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      stack: {
        frontend: "Svelte",
      },
    });

    expect(markdown).toContain("## Technology Stack");
    expect(markdown).toContain("| Frontend | Svelte |");
    expect(markdown).not.toContain("## Goals");
    expect(markdown).not.toContain("## Features");
    expect(markdown).not.toContain("## Database");
    expect(markdown).not.toContain("| Backend |");
  });

  it("preserves feature order from the source spec", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      features: [
        {
          id: "feature-a",
          name: "Feature A",
          description: "First.",
          priority: "later",
          status: "planned",
          acceptanceCriteria: [],
        },
        {
          id: "feature-b",
          name: "Feature B",
          description: "Second.",
          priority: "must",
          status: "implemented",
          acceptanceCriteria: [],
        },
        {
          id: "feature-c",
          name: "Feature C",
          description: "Third.",
          priority: "should",
          status: "approved",
          acceptanceCriteria: [],
        },
      ],
    });

    expect(headingIndex(markdown, "### Feature: Feature A")).toBeLessThan(
      headingIndex(markdown, "### Feature: Feature B"),
    );
    expect(headingIndex(markdown, "### Feature: Feature B")).toBeLessThan(
      headingIndex(markdown, "### Feature: Feature C"),
    );
  });

  it("preserves API endpoint order from the source spec", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      api: {
        endpoints: [
          {
            method: "GET",
            path: "/a",
            purpose: "Read A.",
            authRequired: false,
          },
          {
            method: "POST",
            path: "/b",
            purpose: "Create B.",
            authRequired: true,
          },
          {
            method: "DELETE",
            path: "/c",
            purpose: "Remove C.",
            authRequired: true,
          },
        ],
      },
    });

    expect(markdown.indexOf("### `GET /a`")).toBeLessThan(
      markdown.indexOf("### `POST /b`"),
    );
    expect(markdown.indexOf("### `POST /b`")).toBeLessThan(
      markdown.indexOf("### `DELETE /c`"),
    );
  });

  it("preserves AI rule order from the source spec", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      aiRules: [
        {
          id: "rule-a",
          title: "Rule A",
          priority: "later",
          activationMode: "always",
          body: "A",
          rationale: "A first.",
        },
        {
          id: "rule-b",
          title: "Rule B",
          priority: "must",
          activationMode: "manual",
          body: "B",
          rationale: "B second.",
        },
        {
          id: "rule-c",
          title: "Rule C",
          priority: "should",
          activationMode: "agent_decides",
          body: "C",
          rationale: "C third.",
        },
      ],
    });

    expect(headingIndex(markdown, "### Rule: Rule A")).toBeLessThan(
      headingIndex(markdown, "### Rule: Rule B"),
    );
    expect(headingIndex(markdown, "### Rule: Rule B")).toBeLessThan(
      headingIndex(markdown, "### Rule: Rule C"),
    );
  });

  it("renders globs for scoped AI rules", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      aiRules: [
        {
          id: "rule-scoped",
          title: "Scoped handlers",
          priority: "should",
          activationMode: "scoped",
          globs: ["src/**/api/**", "src/app/**/route.ts"],
          body: "Keep handlers thin.",
          rationale: "Transport code should stay replaceable.",
        },
      ],
    });

    expect(markdown).toContain("**Activation:** scoped");
    expect(markdown).toContain("**Globs:**");
    expect(markdown).toContain("- src/**/api/**");
    expect(markdown).toContain("- src/app/**/route.ts");
  });

  it("keeps generated Markdown readable when values contain special characters", () => {
    const markdown = renderAgentsMd({
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
        backend: "Go `modules`",
      },
      features: [
        {
          id: "feature-special",
          name: "Export #1",
          description: "Supports `code`, *lists*, and | pipes.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: ["Value can contain a `|` character."],
        },
      ],
    });

    expect(markdown).toContain("**Name:** Pipe | Hash # Star * Under_score");
    expect(markdown).toContain("Line one.\nLine two with `code`.");
    expect(markdown).toContain("| Frontend | Next.js \\| React |");
    expect(markdown).toContain("| Backend | Go `modules` |");
    expect(markdown).toContain("### Feature: Export #1");
    expect(markdown.split("\n").some((line) => line.startsWith("| Frontend |"))).toBe(
      true,
    );
    expect(markdown).not.toMatch(/undefined|null|\[object Object\]/);
  });

  it("is deterministic for the same ProjectSpec", () => {
    expect(renderAgentsMd(fullSpec)).toBe(renderAgentsMd(fullSpec));
  });

  it("does not mutate the input ProjectSpec", () => {
    const spec: ProjectSpec = structuredClone(fullSpec);
    const snapshot = structuredClone(spec);

    renderAgentsMd(spec);

    expect(spec).toEqual(snapshot);
    expect(spec.features?.map((feature) => feature.id)).toEqual([
      "feature-visit-board",
      "feature-offline-notes",
      "feature-customer-portal",
    ]);
  });

  it("omits empty sections instead of emitting placeholders", () => {
    const markdown = renderAgentsMd({
      ...minimalSpec,
      goals: {
        primary: [],
        successCriteria: [],
      },
      features: [],
      users: [],
      stack: {},
      architecture: {},
      database: {},
      api: {
        endpoints: [],
      },
      security: {},
      constraints: {},
      aiRules: [],
    });

    for (const heading of optionalSectionHeadings) {
      expect(markdown).not.toContain(heading);
    }
    expect(markdown).not.toContain("N/A");
    expect(markdown).not.toContain("Unknown");
    expect(markdown).not.toContain("Not specified");
  });

  it("ends with exactly one newline", () => {
    const markdown = renderAgentsMd(fullSpec);

    expect(markdown.endsWith("\n")).toBe(true);
    expect(markdown.endsWith("\n\n")).toBe(false);
  });

  it("keeps the documented section order", () => {
    const markdown = renderAgentsMd(fullSpec);
    const headings = [...markdown.matchAll(/^#{1,2} .+$/gm)].map(
      (match) => match[0],
    );

    expect(headings).toEqual([
      "# Project",
      "## Overview",
      "## Goals",
      "## Features",
      "## Users",
      "## Technology Stack",
      "## Architecture",
      "## Database",
      "## API",
      "## Security",
      "## Constraints",
      "## AI Rules",
    ]);
  });
});
