import { describe, expect, it } from "vitest";
import type { AIRule, ProjectSpec } from "../schema/project-spec";
import { renderAgentsMd } from "../../renderers/agents-md/renderer";
import { renderClaudeCode } from "../../renderers/claude-code/renderer";
import { renderCursor } from "../../renderers/cursor/renderer";
import { renderQoder } from "../../renderers/qoder/renderer";
import { capabilitiesFor } from "./capabilities";
import { compareDiagnostics, DiagnosticCode } from "./diagnostics";
import {
  type ConsistencyTarget,
  checkConsistency,
  checkRenderedEquivalence,
  checkRendererConsistency,
} from "./engine";

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
        statement: "Let technicians close visits from a phone browser.",
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

const alwaysRule = fullSpec.aiRules[0];
const scopedRule = fullSpec.aiRules[1];

function agentsTarget(spec: ProjectSpec): ConsistencyTarget {
  return {
    name: "agents-md",
    files: [{ path: "AGENTS.md", content: renderAgentsMd(spec) }],
  };
}

function validTarget(content: string, path = "spec.md"): ConsistencyTarget {
  return {
    name: "valid",
    files: [{ path, content }],
  };
}

function rendererTargets(spec: ProjectSpec): ConsistencyTarget[] {
  return [
    agentsTarget(spec),
    { name: "cursor", files: renderCursor(spec).files },
    { name: "qoder", files: renderQoder(spec).files },
    { name: "claude-code", files: renderClaudeCode(spec).files },
  ];
}

function errorCodes(report: ReturnType<typeof checkConsistency>): string[] {
  return report.diagnostics
    .filter((item) => item.severity === "error")
    .map((item) => item.code);
}

function hasDiagnostic(
  report: ReturnType<typeof checkConsistency>,
  code: string,
  semanticPath?: string,
): boolean {
  return report.diagnostics.some(
    (item) =>
      item.code === code &&
      (semanticPath === undefined || item.semanticPath === semanticPath),
  );
}

function completeRuleMarkdown(rule: AIRule): string {
  const globs =
    "globs" in rule && rule.globs
      ? rule.globs.map((glob) => `- ${glob}`).join("\n")
      : "";

  return [
    `# ${rule.title}`,
    `**ID:** ${rule.id}`,
    `**Priority:** ${rule.priority}`,
    `**Activation:** ${rule.activationMode}`,
    rule.description ?? "",
    rule.body,
    globs,
    `**Rationale:** ${rule.rationale}`,
  ]
    .filter((block) => block.length > 0)
    .join("\n");
}

function projectAndRules(spec: ProjectSpec, rules = spec.aiRules ?? []): string {
  return [`# ${spec.project.name}`, ...rules.map(completeRuleMarkdown)].join(
    "\n\n",
  );
}

describe("checkConsistency", () => {
  describe("basic behavior", () => {
    it("accepts a minimal ProjectSpec without requiring omitted sections", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget(`# ${minimalSpec.project.name}\n`),
      ]);

      expect(report.ok).toBe(true);
      expect(report.diagnostics).toEqual([]);
    });

    it("accepts a full ProjectSpec from every current renderer", () => {
      const report = checkConsistency(fullSpec, rendererTargets(fullSpec));

      expect(errorCodes(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it("emits no diagnostics for a valid synthetic target", () => {
      const content = [
        `# ${fullSpec.project.name}`,
        fullSpec.goals.primary.map((goal) => goal.id).join("\n"),
        fullSpec.features.map((feature) => feature.id).join("\n"),
        fullSpec.users.map((user) => user.id).join("\n"),
        fullSpec.stack.frontend,
        fullSpec.architecture.style,
        fullSpec.architecture.components.map((item) => item.id).join("\n"),
        fullSpec.database.entities.map((item) => item.id).join("\n"),
        fullSpec.api.endpoints
          .map((endpoint) => `${endpoint.method} ${endpoint.path}`)
          .join("\n"),
        fullSpec.security.authentication[0],
        fullSpec.constraints.budget,
        ...fullSpec.aiRules.map(completeRuleMarkdown),
      ].join("\n\n");

      const report = checkConsistency(fullSpec, [validTarget(content)]);

      expect(report.diagnostics).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it("orders diagnostics deterministically", () => {
      const report = checkConsistency(fullSpec, [
        {
          name: "broken",
          files: [
            { path: "", content: "" },
            { path: "dup.md", content: "undefined" },
            { path: "dup.md", content: "also null and [object Object]" },
          ],
        },
      ]);

      expect(report.diagnostics).toEqual(
        [...report.diagnostics].sort(compareDiagnostics),
      );
      expect(report.ok).toBe(false);
      expect(report.diagnostics[0]?.code).toBe(DiagnosticCode.OUTPUT_EMPTY);
    });
  });

  describe("section coverage", () => {
    const projectOnly = `# ${fullSpec.project.name}\n`;

    it("reports a missing project representation", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget("# Untitled project\n"),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "project")).toBe(
        true,
      );
      expect(report.ok).toBe(false);
    });

    it("reports missing goals", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "goals")).toBe(
        true,
      );
    });

    it("reports missing features", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "features")).toBe(
        true,
      );
    });

    it("reports missing users", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "users")).toBe(
        true,
      );
    });

    it("reports missing stack", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "stack")).toBe(
        true,
      );
    });

    it("reports missing architecture", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(
        hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "architecture"),
      ).toBe(true);
    });

    it("reports missing database", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "database")).toBe(
        true,
      );
    });

    it("reports missing API", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "api")).toBe(
        true,
      );
    });

    it("reports missing security", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "security")).toBe(
        true,
      );
    });

    it("reports missing constraints", () => {
      const report = checkConsistency(fullSpec, [validTarget(projectOnly)]);

      expect(
        hasDiagnostic(report, DiagnosticCode.SECTION_MISSING, "constraints"),
      ).toBe(true);
    });
  });

  describe("AI rules", () => {
    it("reports a missing AI rule", () => {
      const report = checkConsistency(fullSpec, [
        validTarget(projectAndRules(fullSpec, [alwaysRule])),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.AI_RULE_MISSING)).toBe(true);
      expect(
        report.diagnostics.some((item) =>
          item.message.includes('AI rule "rule-api-handlers" is missing'),
        ),
      ).toBe(true);
    });

    it("reports a duplicate AI rule", () => {
      const rule = completeRuleMarkdown(alwaysRule);
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n\n${rule}\n\n${rule}`,
          ),
        ],
      );

      expect(hasDiagnostic(report, DiagnosticCode.AI_RULE_DUPLICATE)).toBe(true);
      expect(report.ok).toBe(false);
    });

    it("reports a missing rule title", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n**ID:** ${alwaysRule.id}\n**Priority:** must\n**Activation:** always\n${alwaysRule.body}\n**Rationale:** ${alwaysRule.rationale}\n${alwaysRule.description}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(report, DiagnosticCode.AI_RULE_METADATA_MISSING, "aiRules[0].title"),
      ).toBe(true);
    });

    it("reports a missing rule body", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${alwaysRule.title}\n**ID:** ${alwaysRule.id}\n**Priority:** must\n**Activation:** always\n**Rationale:** ${alwaysRule.rationale}\n${alwaysRule.description}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(report, DiagnosticCode.AI_RULE_METADATA_MISSING, "aiRules[0].body"),
      ).toBe(true);
    });

    it("reports missing priority", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${alwaysRule.title}\n**ID:** ${alwaysRule.id}\n**Activation:** always\n${alwaysRule.body}\n**Rationale:** ${alwaysRule.rationale}\n${alwaysRule.description}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.AI_RULE_METADATA_MISSING,
          "aiRules[0].priority",
        ),
      ).toBe(true);
    });

    it("reports missing activation metadata", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${alwaysRule.title}\n**ID:** ${alwaysRule.id}\n**Priority:** must\n${alwaysRule.body}\n**Rationale:** ${alwaysRule.rationale}\n${alwaysRule.description}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.AI_RULE_METADATA_MISSING,
          "aiRules[0].activationMode",
        ),
      ).toBe(true);
    });

    it("reports a missing description", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${alwaysRule.title}\n**ID:** ${alwaysRule.id}\n**Priority:** must\n**Activation:** always\n${alwaysRule.body}\n**Rationale:** ${alwaysRule.rationale}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.AI_RULE_METADATA_MISSING,
          "aiRules[0].description",
        ),
      ).toBe(true);
    });

    it("reports a missing rationale", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [alwaysRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${alwaysRule.title}\n**ID:** ${alwaysRule.id}\n**Priority:** must\n**Activation:** always\n${alwaysRule.body}\n${alwaysRule.description}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.AI_RULE_METADATA_MISSING,
          "aiRules[0].rationale",
        ),
      ).toBe(true);
    });

    it("reports missing scoped globs", () => {
      const report = checkConsistency(
        { ...minimalSpec, aiRules: [scopedRule] },
        [
          validTarget(
            `# ${minimalSpec.project.name}\n# ${scopedRule.title}\n**ID:** ${scopedRule.id}\n**Priority:** should\n**Activation:** scoped\n${scopedRule.body}\n**Rationale:** ${scopedRule.rationale}`,
          ),
        ],
      );

      expect(
        hasDiagnostic(report, DiagnosticCode.AI_RULE_GLOB_MISSING, "aiRules[0].globs"),
      ).toBe(true);
    });
  });

  describe("output integrity", () => {
    it("reports an empty file", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget("   \n", "empty.md"),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_EMPTY)).toBe(true);
      expect(report.ok).toBe(false);
    });

    it("reports an absolute path", () => {
      const report = checkConsistency(minimalSpec, [
        {
          name: "valid",
          files: [{ path: "/tmp/rules.md", content: `# ${minimalSpec.project.name}` }],
        },
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_INVALID_PATH)).toBe(true);
    });

    it("reports path traversal", () => {
      const report = checkConsistency(minimalSpec, [
        {
          name: "valid",
          files: [
            { path: "../secret.md", content: `# ${minimalSpec.project.name}` },
          ],
        },
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_INVALID_PATH)).toBe(true);
    });

    it("reports a Windows absolute path", () => {
      const report = checkConsistency(minimalSpec, [
        {
          name: "valid",
          files: [
            {
              path: "C:\\Windows\\rules.md",
              content: `# ${minimalSpec.project.name}`,
            },
          ],
        },
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_INVALID_PATH)).toBe(true);
    });

    it("reports a duplicate output path", () => {
      const content = `# ${minimalSpec.project.name}`;
      const report = checkConsistency(minimalSpec, [
        {
          name: "valid",
          files: [
            { path: "foo.md", content },
            { path: "foo.md", content },
          ],
        },
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_PATH_DUPLICATE)).toBe(
        true,
      );
    });

    it("reports leaked undefined", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget(`# ${minimalSpec.project.name}\nundefined`),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_UNDEFINED)).toBe(true);
    });

    it("reports leaked null", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget(`# ${minimalSpec.project.name}\nnull`),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_NULL)).toBe(true);
    });

    it("reports leaked [object Object]", () => {
      const report = checkConsistency(minimalSpec, [
        validTarget(`# ${minimalSpec.project.name}\n[object Object]`),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.OUTPUT_OBJECT_STRING)).toBe(
        true,
      );
    });
  });

  describe("ordering", () => {
    it("reports reversed feature order", () => {
      const report = checkConsistency(fullSpec, [
        validTarget(
          [
            `# ${fullSpec.project.name}`,
            "feature-offline-notes",
            "feature-visit-board",
            "feature-customer-portal",
            fullSpec.goals.primary[0].id,
            fullSpec.users[0].id,
            fullSpec.users[1].id,
            fullSpec.stack.frontend,
            fullSpec.architecture.style,
            fullSpec.database.entities[0].id,
            "GET /visits",
            fullSpec.security.authentication[0],
            fullSpec.constraints.budget,
            ...fullSpec.aiRules.map(completeRuleMarkdown),
          ].join("\n"),
        ),
      ]);

      expect(
        hasDiagnostic(report, DiagnosticCode.ORDER_MISMATCH, "features"),
      ).toBe(true);
    });

    it("reports reversed user order", () => {
      const report = checkConsistency(fullSpec, [
        validTarget(
          [
            `# ${fullSpec.project.name}`,
            "user-technician",
            "user-dispatcher",
            ...fullSpec.features.map((feature) => feature.id),
            fullSpec.goals.primary[0].id,
            fullSpec.stack.frontend,
            fullSpec.architecture.style,
            fullSpec.database.entities[0].id,
            "GET /visits",
            fullSpec.security.authentication[0],
            fullSpec.constraints.budget,
            ...fullSpec.aiRules.map(completeRuleMarkdown),
          ].join("\n"),
        ),
      ]);

      expect(hasDiagnostic(report, DiagnosticCode.ORDER_MISMATCH, "users")).toBe(
        true,
      );
    });

    it("reports reversed API order", () => {
      const report = checkConsistency(fullSpec, [
        validTarget(
          [
            `# ${fullSpec.project.name}`,
            "POST /visits",
            "GET /visits",
            "DELETE /visits/:id",
            ...fullSpec.features.map((feature) => feature.id),
            ...fullSpec.users.map((user) => user.id),
            fullSpec.goals.primary[0].id,
            fullSpec.stack.frontend,
            fullSpec.architecture.style,
            fullSpec.database.entities[0].id,
            fullSpec.security.authentication[0],
            fullSpec.constraints.budget,
            ...fullSpec.aiRules.map(completeRuleMarkdown),
          ].join("\n"),
        ),
      ]);

      expect(
        hasDiagnostic(report, DiagnosticCode.ORDER_MISMATCH, "api.endpoints"),
      ).toBe(true);
    });

    it("reports reversed AI rule order", () => {
      const reversed = [...fullSpec.aiRules].reverse();
      const report = checkConsistency(fullSpec, [
        validTarget(
          [
            `# ${fullSpec.project.name}`,
            ...fullSpec.features.map((feature) => feature.id),
            ...fullSpec.users.map((user) => user.id),
            fullSpec.goals.primary[0].id,
            fullSpec.stack.frontend,
            fullSpec.architecture.style,
            fullSpec.database.entities[0].id,
            "GET /visits",
            "POST /visits",
            fullSpec.security.authentication[0],
            fullSpec.constraints.budget,
            ...reversed.map(completeRuleMarkdown),
          ].join("\n"),
        ),
      ]);

      expect(
        hasDiagnostic(report, DiagnosticCode.ORDER_MISMATCH, "aiRules"),
      ).toBe(true);
    });
  });

  describe("target-specific semantics", () => {
    it("accepts Claude Code scoped rules through paths plus Markdown", () => {
      const result = renderClaudeCode(fullSpec);
      const scoped = result.files.find((file) =>
        file.content.includes("**ID:** rule-api-handlers"),
      );

      expect(scoped?.content).toContain("paths:");
      expect(scoped?.content).toContain("src/**/api/**");

      const report = checkConsistency(fullSpec, [
        { name: "claude-code", files: result.files },
      ]);

      expect(
        report.diagnostics.some(
          (item) => item.code === DiagnosticCode.AI_RULE_GLOB_MISSING,
        ),
      ).toBe(false);
      expect(report.ok).toBe(true);
    });

    it("accepts Claude Code priority represented in the rule body", () => {
      const result = renderClaudeCode(fullSpec);
      const always = result.files.find((file) =>
        file.content.includes("**ID:** rule-core-purity"),
      );

      expect(always?.content).toContain("**Priority:** must");
      expect(capabilitiesFor("claude-code").nativePriority).toBe(false);

      const report = checkConsistency(fullSpec, [
        { name: "claude-code", files: result.files },
      ]);

      expect(
        report.diagnostics.some(
          (item) =>
            item.code === DiagnosticCode.AI_RULE_METADATA_MISSING &&
            item.semanticPath?.endsWith(".priority"),
        ),
      ).toBe(false);
      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.TARGET_LIMITATION,
          "aiRules.priority",
        ),
      ).toBe(true);
    });

    it("accepts Qoder native activation mapping", () => {
      const result = renderQoder(fullSpec);
      const contents = result.files.map((file) => file.content).join("\n");

      expect(contents).toContain("trigger: always_on");
      expect(contents).toContain("trigger: glob");
      expect(contents).toContain("trigger: manual");
      expect(contents).toContain("trigger: model_decision");

      const report = checkConsistency(fullSpec, [
        { name: "qoder", files: result.files },
      ]);

      expect(
        report.diagnostics.some(
          (item) =>
            item.code === DiagnosticCode.AI_RULE_METADATA_MISSING &&
            item.semanticPath?.endsWith(".activationMode"),
        ),
      ).toBe(false);
      expect(
        report.diagnostics.some(
          (item) =>
            item.code === DiagnosticCode.TARGET_LIMITATION &&
            item.semanticPath?.startsWith("aiRules.activationMode"),
        ),
      ).toBe(false);
      expect(report.ok).toBe(true);
    });

    it("accepts Cursor activation mapping without treating Markdown fallback as loss", () => {
      const result = renderCursor(fullSpec);
      const contents = result.files.map((file) => file.content).join("\n");

      expect(contents).toContain("alwaysApply: true");
      expect(contents).toContain("**Activation:** manual");
      expect(contents).toContain("**Activation:** agent_decides");

      const report = checkConsistency(fullSpec, [
        { name: "cursor", files: result.files },
      ]);

      expect(errorCodes(report)).toEqual([]);
      expect(
        hasDiagnostic(
          report,
          DiagnosticCode.TARGET_LIMITATION,
          "aiRules.activationMode.manual",
        ),
      ).toBe(true);
      expect(report.ok).toBe(true);
    });

    it("accepts AGENTS.md semantic representation", () => {
      const content = renderAgentsMd(fullSpec);

      expect(content).toContain("**ID:** feature-visit-board");
      expect(content).toContain("**ID:** rule-core-purity");
      expect(content).toContain("**Activation:** scoped");

      const report = checkConsistency(fullSpec, [agentsTarget(fullSpec)]);

      expect(errorCodes(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });
  });

  describe("robustness", () => {
    const specialSpec = {
      project: {
        name: 'FieldKit "Alpha" & Co',
        description: "A toolkit with <special> characters.",
        problem: "Names are messy.",
        targetUsers: ["Writers"],
        type: "web application",
        status: "draft",
      },
      features: [
        {
          id: "feature-special",
          name: 'Visit "board" & notes',
          description: "Handles <angled> labels.",
          priority: "must",
          status: "planned",
          acceptanceCriteria: [],
        },
      ],
      aiRules: [
        {
          id: "rule-special",
          title: 'Prefer "local" names & <existing> types',
          priority: "must",
          activationMode: "always",
          description: 'Apply when editing "quoted" files.',
          body: "Keep punctuation intact.\n\nSecond paragraph with `code`.",
          rationale: "Special characters must survive rendering.",
        },
      ],
    } as const satisfies ProjectSpec;

    it("preserves special characters through real renderers", () => {
      const report = checkConsistency(specialSpec, rendererTargets(specialSpec));

      expect(errorCodes(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it("preserves multiline rule bodies", () => {
      const content = renderAgentsMd(specialSpec);

      expect(content).toContain("Keep punctuation intact.");
      expect(content).toContain("Second paragraph with `code`.");

      const report = checkConsistency(specialSpec, [agentsTarget(specialSpec)]);

      expect(
        report.diagnostics.some((item) => item.semanticPath === "aiRules[0].body"),
      ).toBe(false);
    });

    it("returns the same report for repeated runs", () => {
      const targets = rendererTargets(fullSpec);
      const first = checkConsistency(fullSpec, targets);
      const second = checkConsistency(fullSpec, targets);

      expect(second).toEqual(first);
    });

    it("does not mutate the input spec or target files", () => {
      const spec = structuredClone(fullSpec) as ProjectSpec;
      const files = [{ path: "AGENTS.md", content: renderAgentsMd(spec) }];
      const target = { name: "agents-md", files };
      const before = JSON.stringify({ spec, target });

      Object.freeze(spec);
      Object.freeze(files);
      Object.freeze(target);

      const report = checkConsistency(spec, [target]);

      expect(report.ok).toBe(true);
      expect(JSON.stringify({ spec, target })).toBe(before);
    });
  });

  describe("report and helpers", () => {
    it("keeps ok true when only warnings and info are present", () => {
      const report = checkConsistency(fullSpec, [agentsTarget(fullSpec)]);

      expect(report.diagnostics.length).toBeGreaterThan(0);
      expect(report.diagnostics.every((item) => item.severity !== "error")).toBe(
        true,
      );
      expect(report.ok).toBe(true);
    });

    it("checks renderer results through the convenience API", () => {
      const report = checkRendererConsistency(fullSpec, {
        "agents-md": renderAgentsMd(fullSpec),
        cursor: renderCursor(fullSpec),
        qoder: renderQoder(fullSpec),
        "claude-code": renderClaudeCode(fullSpec),
      });

      expect(errorCodes(report)).toEqual([]);
      expect(report.ok).toBe(true);
    });

    it("treats identical renderer runs as equivalent", () => {
      const first = {
        name: "cursor",
        files: renderCursor(fullSpec).files,
      };
      const second = {
        name: "cursor",
        files: renderCursor(fullSpec).files,
      };

      const report = checkRenderedEquivalence(first, second);

      expect(report.ok).toBe(true);
      expect(report.diagnostics).toEqual([]);
    });

    it("flags non-deterministic renderer output", () => {
      const first = {
        name: "cursor",
        files: renderCursor(fullSpec).files,
      };
      const second = {
        name: "cursor",
        files: first.files.map((file, index) =>
          index === 0 ? { ...file, content: `${file.content}\nextra\n` } : file,
        ),
      };

      const report = checkRenderedEquivalence(first, second);

      expect(hasDiagnostic(report, DiagnosticCode.NON_DETERMINISTIC)).toBe(true);
      expect(report.ok).toBe(false);
    });
  });
});
