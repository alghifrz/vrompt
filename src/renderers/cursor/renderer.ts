import type {
  AIRule,
  Api,
  Architecture,
  Constraint,
  DatabaseSpec,
  Feature,
  Goals,
  ProjectSpec,
  Security,
  Stack,
  UserType,
} from "../../core/schema/project-spec";
import { toSafeRuleFilename, uniqueRuleFilenames } from "./filename";
import {
  type CursorFrontmatter,
  renderCursorRuleFile,
} from "./frontmatter";
import {
  bulletList,
  headingSection,
  headingText,
  inlineCode,
  joinBlocks,
  labeledValue,
} from "./markdown";

export interface RenderedFile {
  path: string;
  content: string;
}

export interface CursorRenderResult {
  files: RenderedFile[];
}

const RULES_DIR = ".cursor/rules";

function hasItems<T>(value: readonly T[] | undefined): value is readonly T[] {
  return value !== undefined && value.length > 0;
}

function sectionFile(
  filename: string,
  description: string,
  body: string | undefined,
): RenderedFile | undefined {
  if (!body) {
    return undefined;
  }

  return {
    path: `${RULES_DIR}/${filename}`,
    content: renderCursorRuleFile(
      { description, alwaysApply: true },
      body,
    ),
  };
}

function renderProjectOverview(spec: ProjectSpec): RenderedFile {
  const { project } = spec;
  const body = joinBlocks([
    "# Project Overview",
    headingSection("Name", project.name),
    headingSection("Description", project.description),
    headingSection("Problem", project.problem),
    headingSection("Target Users", bulletList(project.targetUsers)),
    headingSection("Type", project.type),
    headingSection("Status", project.status),
  ]);

  return {
    path: `${RULES_DIR}/project-overview.mdc`,
    content: renderCursorRuleFile(
      {
        description: "Project overview and core project context",
        alwaysApply: true,
      },
      body,
    ),
  };
}

function renderGoalsBody(goals: Goals): string | undefined {
  const primary = hasItems(goals.primary)
    ? joinBlocks([
        "## Primary Goals",
        bulletList(
          goals.primary.map((goal) => `**${goal.id}:** ${goal.statement}`),
        ),
      ])
    : undefined;
  const successCriteria = hasItems(goals.successCriteria)
    ? joinBlocks(["## Success Criteria", bulletList(goals.successCriteria)])
    : undefined;

  if (!primary && !successCriteria) {
    return undefined;
  }

  return joinBlocks(["# Goals", primary, successCriteria]);
}

function renderFeature(feature: Feature): string {
  return joinBlocks([
    `### ${headingText(feature.name)}`,
    [
      labeledValue("ID", feature.id),
      labeledValue("Priority", feature.priority),
      labeledValue("Status", feature.status),
    ].join("\n"),
    feature.description,
    hasItems(feature.acceptanceCriteria)
      ? joinBlocks([
          "#### Acceptance Criteria",
          bulletList(feature.acceptanceCriteria),
        ])
      : undefined,
  ]);
}

function renderFeaturesBody(
  features: readonly Feature[],
): string | undefined {
  if (!hasItems(features)) {
    return undefined;
  }

  return joinBlocks(["# Features", ...features.map(renderFeature)]);
}

function renderUser(user: UserType): string {
  return joinBlocks([
    `### ${headingText(user.name)}`,
    labeledValue("ID", user.id),
    user.description,
    hasItems(user.goals)
      ? joinBlocks(["#### Goals", bulletList(user.goals)])
      : undefined,
    hasItems(user.permissions)
      ? joinBlocks(["#### Permissions", bulletList(user.permissions)])
      : undefined,
  ]);
}

function renderUsersBody(users: readonly UserType[]): string | undefined {
  if (!hasItems(users)) {
    return undefined;
  }

  return joinBlocks(["# Users", ...users.map(renderUser)]);
}

function renderStackBody(stack: Stack): string | undefined {
  const layers = joinBlocks([
    stack.frontend ? headingSection("Frontend", stack.frontend) : undefined,
    stack.backend ? headingSection("Backend", stack.backend) : undefined,
    stack.database ? headingSection("Database", stack.database) : undefined,
    stack.authentication
      ? headingSection("Authentication", stack.authentication)
      : undefined,
    stack.hosting ? headingSection("Hosting", stack.hosting) : undefined,
    hasItems(stack.additional)
      ? headingSection("Additional Technologies", bulletList(stack.additional))
      : undefined,
  ]);

  return layers ? joinBlocks(["# Technology Stack", layers]) : undefined;
}

function renderArchitectureBody(
  architecture: Architecture,
): string | undefined {
  const style = architecture.style
    ? headingSection("Style", architecture.style)
    : undefined;
  const components = hasItems(architecture.components)
    ? joinBlocks([
        "## Components",
        ...architecture.components.map((component) =>
          joinBlocks([
            `### ${headingText(component.name)}`,
            labeledValue("ID", component.id),
            component.description,
          ]),
        ),
      ])
    : undefined;
  const externalServices = hasItems(architecture.externalServices)
    ? joinBlocks([
        "## External Services",
        ...architecture.externalServices.map((service) =>
          joinBlocks([
            `### ${headingText(service.name)}`,
            labeledValue("ID", service.id),
            service.purpose,
          ]),
        ),
      ])
    : undefined;
  const constraints = hasItems(architecture.constraints)
    ? joinBlocks(["## Constraints", bulletList(architecture.constraints)])
    : undefined;

  if (!style && !components && !externalServices && !constraints) {
    return undefined;
  }

  return joinBlocks([
    "# Architecture",
    style,
    components,
    externalServices,
    constraints,
  ]);
}

function renderDatabaseBody(database: DatabaseSpec): string | undefined {
  const entities = hasItems(database.entities)
    ? joinBlocks([
        "## Entities",
        ...database.entities.map((entity) =>
          joinBlocks([
            `### ${headingText(entity.name)}`,
            labeledValue("ID", entity.id),
            entity.description,
          ]),
        ),
      ])
    : undefined;
  const relationships = hasItems(database.relationships)
    ? joinBlocks([
        "## Relationships",
        bulletList(
          database.relationships.map((relationship) => {
            const summary = `${inlineCode(relationship.from)} → ${inlineCode(relationship.to)} (${relationship.type})`;
            return relationship.description
              ? `${summary}: ${relationship.description}`
              : summary;
          }),
        ),
      ])
    : undefined;
  const constraints = hasItems(database.constraints)
    ? joinBlocks(["## Constraints", bulletList(database.constraints)])
    : undefined;

  if (!entities && !relationships && !constraints) {
    return undefined;
  }

  return joinBlocks(["# Database", entities, relationships, constraints]);
}

function renderApiBody(api: Api): string | undefined {
  if (!hasItems(api.endpoints)) {
    return undefined;
  }

  return joinBlocks([
    "# API",
    ...api.endpoints.map((endpoint) =>
      joinBlocks([
        `### ${inlineCode(`${endpoint.method} ${endpoint.path}`)}`,
        labeledValue("Purpose", endpoint.purpose),
        labeledValue(
          "Authentication Required",
          endpoint.authRequired ? "Yes" : "No",
        ),
      ]),
    ),
  ]);
}

function renderSecurityBody(security: Security): string | undefined {
  const authentication = hasItems(security.authentication)
    ? joinBlocks(["## Authentication", bulletList(security.authentication)])
    : undefined;
  const authorization = hasItems(security.authorization)
    ? joinBlocks(["## Authorization", bulletList(security.authorization)])
    : undefined;
  const sensitiveData = hasItems(security.sensitiveData)
    ? joinBlocks(["## Sensitive Data", bulletList(security.sensitiveData)])
    : undefined;
  const constraints = hasItems(security.constraints)
    ? joinBlocks(["## Constraints", bulletList(security.constraints)])
    : undefined;

  if (!authentication && !authorization && !sensitiveData && !constraints) {
    return undefined;
  }

  return joinBlocks([
    "# Security",
    authentication,
    authorization,
    sensitiveData,
    constraints,
  ]);
}

function renderConstraintsBody(
  constraints: Constraint,
): string | undefined {
  const budget = constraints.budget
    ? headingSection("Budget", constraints.budget)
    : undefined;
  const deployment = hasItems(constraints.deployment)
    ? joinBlocks(["## Deployment", bulletList(constraints.deployment)])
    : undefined;
  const technology = hasItems(constraints.technology)
    ? joinBlocks(["## Technology", bulletList(constraints.technology)])
    : undefined;
  const compliance = hasItems(constraints.compliance)
    ? joinBlocks(["## Compliance", bulletList(constraints.compliance)])
    : undefined;
  const scope = hasItems(constraints.scope)
    ? joinBlocks(["## Scope", bulletList(constraints.scope)])
    : undefined;

  if (!budget && !deployment && !technology && !compliance && !scope) {
    return undefined;
  }

  return joinBlocks([
    "# Constraints",
    budget,
    deployment,
    technology,
    compliance,
    scope,
  ]);
}

/**
 * Cursor rule frontmatter supports `description`, `globs`, and `alwaysApply`.
 * Neutral ProjectSpec activation modes map as:
 * - always → alwaysApply: true
 * - scoped → alwaysApply: false plus the configured globs
 * - agent_decides → alwaysApply: false so the agent can select the rule
 * - manual → alwaysApply: false so the rule is available but not auto-applied
 * The original activationMode is preserved in the Markdown body.
 */
function frontmatterForAiRule(rule: AIRule): CursorFrontmatter {
  const description = rule.description ?? rule.title;
  const globs = "globs" in rule && hasItems(rule.globs) ? rule.globs : undefined;

  if (rule.activationMode === "always") {
    return { description, alwaysApply: true };
  }

  return {
    description,
    alwaysApply: false,
    ...(globs ? { globs } : {}),
  };
}

function renderAiRuleBody(rule: AIRule): string {
  const globs =
    "globs" in rule && hasItems(rule.globs)
      ? joinBlocks(["**Globs:**", bulletList(rule.globs)])
      : undefined;

  return joinBlocks([
    `# Rule: ${headingText(rule.title)}`,
    [
      labeledValue("ID", rule.id),
      labeledValue("Priority", rule.priority),
      labeledValue("Activation", rule.activationMode),
    ].join("\n"),
    rule.description,
    rule.body,
    globs,
    labeledValue("Rationale", rule.rationale),
  ]);
}

function renderAiRuleFiles(rules: readonly AIRule[]): RenderedFile[] {
  if (!hasItems(rules)) {
    return [];
  }

  const filenames = uniqueRuleFilenames(rules.map((rule) => rule.id));

  return rules.map((rule, index) => {
    const filename = filenames[index] ?? `${toSafeRuleFilename(rule.id)}`;

    return {
      path: `${RULES_DIR}/ai-rules/${filename}`,
      content: renderCursorRuleFile(
        frontmatterForAiRule(rule),
        renderAiRuleBody(rule),
      ),
    };
  });
}

export function renderCursor(spec: ProjectSpec): CursorRenderResult {
  const files = [
    renderProjectOverview(spec),
    spec.goals
      ? sectionFile(
          "goals.mdc",
          "Project goals and success criteria",
          renderGoalsBody(spec.goals),
        )
      : undefined,
    spec.features
      ? sectionFile(
          "features.mdc",
          "Project features and acceptance criteria",
          renderFeaturesBody(spec.features),
        )
      : undefined,
    spec.users
      ? sectionFile(
          "users.mdc",
          "Project user types and permissions",
          renderUsersBody(spec.users),
        )
      : undefined,
    spec.stack
      ? sectionFile(
          "technology-stack.mdc",
          "Technology stack",
          renderStackBody(spec.stack),
        )
      : undefined,
    spec.architecture
      ? sectionFile(
          "architecture.mdc",
          "Architecture and system structure",
          renderArchitectureBody(spec.architecture),
        )
      : undefined,
    spec.database
      ? sectionFile(
          "database.mdc",
          "Conceptual data model",
          renderDatabaseBody(spec.database),
        )
      : undefined,
    spec.api
      ? sectionFile(
          "api.mdc",
          "HTTP API endpoints",
          renderApiBody(spec.api),
        )
      : undefined,
    spec.security
      ? sectionFile(
          "security.mdc",
          "Security requirements",
          renderSecurityBody(spec.security),
        )
      : undefined,
    spec.constraints
      ? sectionFile(
          "constraints.mdc",
          "Project constraints",
          renderConstraintsBody(spec.constraints),
        )
      : undefined,
    ...(spec.aiRules ? renderAiRuleFiles(spec.aiRules) : []),
  ].filter((file): file is RenderedFile => file !== undefined);

  return { files };
}
