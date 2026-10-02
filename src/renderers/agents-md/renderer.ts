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
import {
  bulletList,
  headingText,
  inlineCode,
  joinBlocks,
  labeledValue,
  twoColumnTable,
} from "./markdown";

function hasItems<T>(value: readonly T[] | undefined): value is readonly T[] {
  return value !== undefined && value.length > 0;
}

function renderProject(spec: ProjectSpec): string {
  const { project } = spec;

  return joinBlocks([
    "# Project",
    "## Overview",
    labeledValue("Name", project.name),
    labeledValue("Description", project.description),
    labeledValue("Problem", project.problem),
    `**Target Users:**\n${bulletList(project.targetUsers)}`,
    labeledValue("Type", project.type),
    labeledValue("Status", project.status),
  ]);
}

function renderGoals(goals: Goals): string | undefined {
  const primary = hasItems(goals.primary)
    ? joinBlocks([
        "### Primary Goals",
        bulletList(
          goals.primary.map((goal) => `**${goal.id}:** ${goal.statement}`),
        ),
      ])
    : undefined;
  const successCriteria = hasItems(goals.successCriteria)
    ? joinBlocks(["### Success Criteria", bulletList(goals.successCriteria)])
    : undefined;

  if (!primary && !successCriteria) {
    return undefined;
  }

  return joinBlocks(["## Goals", primary, successCriteria]);
}

function renderFeature(feature: Feature): string {
  const acceptanceCriteria = hasItems(feature.acceptanceCriteria)
    ? joinBlocks([
        "#### Acceptance Criteria",
        bulletList(feature.acceptanceCriteria),
      ])
    : undefined;

  return joinBlocks([
    `### Feature: ${headingText(feature.name)}`,
    [
      labeledValue("ID", feature.id),
      labeledValue("Priority", feature.priority),
      labeledValue("Status", feature.status),
    ].join("\n"),
    feature.description,
    acceptanceCriteria,
  ]);
}

function renderFeatures(features: readonly Feature[]): string | undefined {
  if (!hasItems(features)) {
    return undefined;
  }

  return joinBlocks(["## Features", ...features.map(renderFeature)]);
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

function renderUsers(users: readonly UserType[]): string | undefined {
  if (!hasItems(users)) {
    return undefined;
  }

  return joinBlocks(["## Users", ...users.map(renderUser)]);
}

function renderStack(stack: Stack): string | undefined {
  const rows: Array<readonly [string, string]> = [];

  if (stack.frontend) {
    rows.push(["Frontend", stack.frontend]);
  }
  if (stack.backend) {
    rows.push(["Backend", stack.backend]);
  }
  if (stack.database) {
    rows.push(["Database", stack.database]);
  }
  if (stack.authentication) {
    rows.push(["Authentication", stack.authentication]);
  }
  if (stack.hosting) {
    rows.push(["Hosting", stack.hosting]);
  }

  const additional = hasItems(stack.additional)
    ? joinBlocks(["### Additional Technologies", bulletList(stack.additional)])
    : undefined;

  if (rows.length === 0 && !additional) {
    return undefined;
  }

  return joinBlocks([
    "## Technology Stack",
    rows.length > 0 ? twoColumnTable(["Layer", "Technology"], rows) : undefined,
    additional,
  ]);
}

function renderArchitecture(
  architecture: Architecture,
): string | undefined {
  const style = architecture.style
    ? labeledValue("Style", architecture.style)
    : undefined;
  const components = hasItems(architecture.components)
    ? joinBlocks([
        "### Components",
        bulletList(
          architecture.components.map(
            (component) =>
              `**${component.name}** (${inlineCode(component.id)}): ${component.description}`,
          ),
        ),
      ])
    : undefined;
  const externalServices = hasItems(architecture.externalServices)
    ? joinBlocks([
        "### External Services",
        bulletList(
          architecture.externalServices.map(
            (service) =>
              `**${service.name}** (${inlineCode(service.id)}): ${service.purpose}`,
          ),
        ),
      ])
    : undefined;
  const constraints = hasItems(architecture.constraints)
    ? joinBlocks(["### Constraints", bulletList(architecture.constraints)])
    : undefined;

  if (!style && !components && !externalServices && !constraints) {
    return undefined;
  }

  return joinBlocks([
    "## Architecture",
    style,
    components,
    externalServices,
    constraints,
  ]);
}

function renderDatabase(database: DatabaseSpec): string | undefined {
  const entities = hasItems(database.entities)
    ? joinBlocks([
        "### Entities",
        bulletList(
          database.entities.map(
            (entity) =>
              `**${entity.name}** (${inlineCode(entity.id)}): ${entity.description}`,
          ),
        ),
      ])
    : undefined;
  const relationships = hasItems(database.relationships)
    ? joinBlocks([
        "### Relationships",
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
    ? joinBlocks(["### Constraints", bulletList(database.constraints)])
    : undefined;

  if (!entities && !relationships && !constraints) {
    return undefined;
  }

  return joinBlocks(["## Database", entities, relationships, constraints]);
}

function renderApi(api: Api): string | undefined {
  if (!hasItems(api.endpoints)) {
    return undefined;
  }

  const endpoints = api.endpoints.map((endpoint) =>
    joinBlocks([
      `### ${inlineCode(`${endpoint.method} ${endpoint.path}`)}`,
      labeledValue("Purpose", endpoint.purpose),
      labeledValue(
        "Authentication Required",
        endpoint.authRequired ? "Yes" : "No",
      ),
    ]),
  );

  return joinBlocks(["## API", ...endpoints]);
}

function renderSecurity(security: Security): string | undefined {
  const authentication = hasItems(security.authentication)
    ? joinBlocks(["### Authentication", bulletList(security.authentication)])
    : undefined;
  const authorization = hasItems(security.authorization)
    ? joinBlocks(["### Authorization", bulletList(security.authorization)])
    : undefined;
  const sensitiveData = hasItems(security.sensitiveData)
    ? joinBlocks(["### Sensitive Data", bulletList(security.sensitiveData)])
    : undefined;
  const constraints = hasItems(security.constraints)
    ? joinBlocks(["### Constraints", bulletList(security.constraints)])
    : undefined;

  if (!authentication && !authorization && !sensitiveData && !constraints) {
    return undefined;
  }

  return joinBlocks([
    "## Security",
    authentication,
    authorization,
    sensitiveData,
    constraints,
  ]);
}

function renderConstraints(constraints: Constraint): string | undefined {
  const budget = constraints.budget
    ? labeledValue("Budget", constraints.budget)
    : undefined;
  const deployment = hasItems(constraints.deployment)
    ? joinBlocks(["### Deployment", bulletList(constraints.deployment)])
    : undefined;
  const technology = hasItems(constraints.technology)
    ? joinBlocks(["### Technology", bulletList(constraints.technology)])
    : undefined;
  const compliance = hasItems(constraints.compliance)
    ? joinBlocks(["### Compliance", bulletList(constraints.compliance)])
    : undefined;
  const scope = hasItems(constraints.scope)
    ? joinBlocks(["### Scope", bulletList(constraints.scope)])
    : undefined;

  if (!budget && !deployment && !technology && !compliance && !scope) {
    return undefined;
  }

  return joinBlocks([
    "## Constraints",
    budget,
    deployment,
    technology,
    compliance,
    scope,
  ]);
}

function renderAiRule(rule: AIRule): string {
  const globs =
    "globs" in rule && hasItems(rule.globs)
      ? joinBlocks(["**Globs:**", bulletList(rule.globs)])
      : undefined;

  return joinBlocks([
    `### Rule: ${headingText(rule.title)}`,
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

function renderAiRules(rules: readonly AIRule[]): string | undefined {
  if (!hasItems(rules)) {
    return undefined;
  }

  return joinBlocks(["## AI Rules", ...rules.map(renderAiRule)]);
}

export function renderAgentsMd(spec: ProjectSpec): string {
  const document = joinBlocks([
    renderProject(spec),
    spec.goals ? renderGoals(spec.goals) : undefined,
    spec.features ? renderFeatures(spec.features) : undefined,
    spec.users ? renderUsers(spec.users) : undefined,
    spec.stack ? renderStack(spec.stack) : undefined,
    spec.architecture ? renderArchitecture(spec.architecture) : undefined,
    spec.database ? renderDatabase(spec.database) : undefined,
    spec.api ? renderApi(spec.api) : undefined,
    spec.security ? renderSecurity(spec.security) : undefined,
    spec.constraints ? renderConstraints(spec.constraints) : undefined,
    spec.aiRules ? renderAiRules(spec.aiRules) : undefined,
  ]);

  return `${document}\n`;
}
