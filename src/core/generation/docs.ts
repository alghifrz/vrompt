import type { Feature, ProjectSpec } from "../schema/project-spec";
import type { GeneratedFile } from "./types";

export interface DocField {
  readonly type: string;
  readonly name: string;
  readonly key?: "PK" | "FK";
}

export interface ErdEntityView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly fields: readonly DocField[];
}

export interface ErdLinkView {
  readonly from: string;
  readonly to: string;
  readonly kind: string;
  readonly label: string;
}

export interface ErdView {
  readonly inferred: boolean;
  readonly entities: readonly ErdEntityView[];
  readonly links: readonly ErdLinkView[];
  readonly notes: readonly string[];
}

export interface PrdView {
  readonly name: string;
  readonly type: string;
  readonly problem: string;
  readonly description: string;
  readonly goals: readonly string[];
  readonly successCriteria: readonly string[];
  readonly users: readonly {
    readonly name: string;
    readonly description: string;
    readonly goals: readonly string[];
    readonly permissions: readonly string[];
  }[];
  readonly features: readonly {
    readonly name: string;
    readonly description: string;
    readonly priority: Feature["priority"];
    readonly status: string;
    readonly acceptance: readonly string[];
  }[];
  readonly stack: readonly string[];
  readonly architectureStyle?: string;
  readonly components: readonly string[];
  readonly endpoints: readonly string[];
}

export function buildPrdView(spec: ProjectSpec): PrdView {
  return {
    name: spec.project.name,
    type: spec.project.type,
    problem: spec.project.problem,
    description: spec.project.description,
    goals:
      spec.goals?.primary.map((goal) => goal.statement) ?? [
        "Deliver a small first version that solves the stated problem.",
      ],
    successCriteria: spec.goals?.successCriteria ?? [],
    users: (spec.users ?? []).map((user) => ({
      name: user.name,
      description: user.description,
      goals: user.goals,
      permissions: user.permissions,
    })),
    features: (spec.features ?? []).map((feature) => ({
      name: feature.name,
      description: feature.description,
      priority: feature.priority,
      status: feature.status,
      acceptance: feature.acceptanceCriteria,
    })),
    stack: stackItems(spec),
    architectureStyle: spec.architecture?.style,
    components: (spec.architecture?.components ?? []).map((item) => item.name),
    endpoints: (spec.api?.endpoints ?? []).map(
      (endpoint) => `${endpoint.method} ${endpoint.path}`,
    ),
  };
}

export function buildErdView(spec: ProjectSpec): ErdView {
  const fromSpec = spec.database?.entities ?? [];
  const inferred = fromSpec.length === 0;
  const raw = inferred ? fallbackEntities(spec) : specEntities(spec);
  const entities = applyRelationshipKeys(raw, spec);
  const entityIds = new Set(entities.map((entity) => entity.id));
  const links = linksFor(spec, entities, entityIds);

  return {
    inferred,
    entities,
    links,
    notes: [
      inferred
        ? "Starting model inferred from users, features, API, and auth. Refine after the first version."
        : "Derived from the project database spec, then enriched with auth, API, and user fields.",
      ...(spec.database?.constraints ?? []),
    ],
  };
}

export function renderDocFiles(spec: ProjectSpec): GeneratedFile[] {
  return [
    { path: "PRD.md", content: renderPrd(spec) },
    { path: "ERD.md", content: renderErd(spec) },
  ];
}

export function renderPrd(spec: ProjectSpec): string {
  const view = buildPrdView(spec);
  const must = view.features.filter((feature) => feature.priority === "must");
  const should = view.features.filter((feature) => feature.priority === "should");
  const later = view.features.filter((feature) => feature.priority === "later");

  return [
    `# Product Requirements Document`,
    ``,
    `## 1. Document control`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Product | ${cell(view.name)} |`,
    `| Type | ${cell(view.type)} |`,
    `| Status | ${cell(spec.project.status)} |`,
    `| Audience | ${cell(spec.project.targetUsers.join(", "))} |`,
    `| Version | 1.0 |`,
    ``,
    `This PRD is the product source of truth for ${view.name}. Generated coding-agent files must follow it. Do not invent scope.`,
    ``,
    `## 2. Executive summary`,
    ``,
    view.description,
    ``,
    `**Problem:** ${view.problem}`,
    ``,
    `**First outcome:** ${view.goals[0] ?? "Ship a usable first version."}`,
    ``,
    `## 3. Problem and context`,
    ``,
    `### 3.1 Current pain`,
    ``,
    view.problem,
    ``,
    `### 3.2 Why this product`,
    ``,
    view.description,
    ``,
    `### 3.3 Target users`,
    ``,
    ...spec.project.targetUsers.map((user) => `- ${user}`),
    ``,
    `## 4. Goals and success`,
    ``,
    `### 4.1 Primary goals`,
    ``,
    ...view.goals.map((goal, index) => `${index + 1}. ${goal}`),
    ``,
    `### 4.2 Success criteria`,
    ``,
    ...(view.successCriteria.length
      ? view.successCriteria.map((item) => `- ${item}`)
      : ["- A first-time user can complete the main job without extra setup."]),
    ``,
    `### 4.3 Goal map`,
    ``,
    "```mermaid",
    prdGoalMermaid(view),
    "```",
    ``,
    `## 5. Personas`,
    ``,
    ...(view.users.length
      ? view.users.flatMap((user) => [
          `### ${user.name}`,
          ``,
          user.description,
          ``,
          user.goals.length ? `**Jobs to be done**` : "",
          ...user.goals.map((goal) => `- ${goal}`),
          user.permissions.length ? `` : "",
          user.permissions.length ? `**Permissions**` : "",
          ...user.permissions.map((item) => `- ${item}`),
          ``,
        ])
      : [
          `Detailed personas are not specified yet. Treat the primary audience as: ${spec.project.targetUsers.join(", ")}.`,
          ``,
        ]),
    `## 6. User journey`,
    ``,
    "```mermaid",
    prdJourneyMermaid(spec, view),
    "```",
    ``,
    journeyNarrative(spec, view),
    ``,
    `## 7. Requirements`,
    ``,
    `### 7.1 Priority matrix`,
    ``,
    `| Priority | Count | Features |`,
    `| --- | --- | --- |`,
    `| Must | ${String(must.length)} | ${cell(must.map((item) => item.name).join(", ") || "—")} |`,
    `| Should | ${String(should.length)} | ${cell(should.map((item) => item.name).join(", ") || "—")} |`,
    `| Later | ${String(later.length)} | ${cell(later.map((item) => item.name).join(", ") || "—")} |`,
    ``,
    `### 7.2 Feature map`,
    ``,
    "```mermaid",
    prdFeatureMermaid(view),
    "```",
    ``,
    ...detailedFeatures(view.features),
    `## 8. Experience notes`,
    ``,
    `- First-run experience should explain the product in one screen.`,
    `- Empty states should tell the user what to do next.`,
    `- Errors should be recoverable without losing work.`,
    `- The first version stays small enough to demo end-to-end.`,
    ``,
    `## 9. Technical design`,
    ``,
    `### 9.1 Stack`,
    ``,
    ...(view.stack.length
      ? view.stack.map((item) => `- ${item}`)
      : ["- Stack is still open. Prefer one app and familiar tools."]),
    ``,
    `### 9.2 Architecture`,
    ``,
    view.architectureStyle
      ? `Style: ${view.architectureStyle}.`
      : "Start as one deployable app until a second surface is real.",
    ``,
    ...(spec.architecture?.components?.length
      ? spec.architecture.components.map(
          (component) => `- **${component.name}:** ${component.description}`,
        )
      : []),
    ...(spec.architecture?.constraints?.length
      ? ["", "Constraints:", ...spec.architecture.constraints.map((item) => `- ${item}`)]
      : []),
    ``,
    "```mermaid",
    prdArchitectureMermaid(spec),
    "```",
    ``,
    `### 9.3 API`,
    ``,
    ...(spec.api?.endpoints.length
      ? [
          `| Method | Path | Purpose | Auth |`,
          `| --- | --- | --- | --- |`,
          ...spec.api.endpoints.map(
            (endpoint) =>
              `| ${endpoint.method} | ${cell(endpoint.path)} | ${cell(endpoint.purpose)} | ${
                endpoint.authRequired ? "Required" : "Public"
              } |`,
          ),
        ]
      : ["No public API is specified for the first version."]),
    ``,
    `### 9.4 Security`,
    ``,
    ...securityLines(spec),
    ``,
    `## 10. Constraints and non-goals`,
    ``,
    ...constraintLines(spec),
    ``,
    `## 11. Open questions`,
    ``,
    `- What is the smallest demo path a new user should finish in one sitting?`,
    `- Which feature can wait if the first version slips?`,
    `- What data must never leave the server?`,
    ``,
  ].join("\n");
}

export function renderErd(spec: ProjectSpec): string {
  const view = buildErdView(spec);
  const mermaid = [
    "erDiagram",
    ...view.entities.flatMap((entity) => [
      `  ${entity.id} {`,
      ...entity.fields.map((field) =>
        field.key
          ? `    ${field.type} ${field.name} ${field.key}`
          : `    ${field.type} ${field.name}`,
      ),
      `  }`,
    ]),
    ...view.links.map(
      (link) =>
        `  ${link.from} ${mermaidRel(link.kind)} ${link.to} : ${mermaidLabel(link.label)}`,
    ),
  ].join("\n");

  return [
    `# Entity Relationship Diagram`,
    ``,
    `Logical data model for **${spec.project.name}**. Use this when creating tables, types, and API payloads.`,
    ``,
    ...view.notes.map((note) => `- ${note}`),
    ``,
    `## 1. Visual model`,
    ``,
    "```mermaid",
    mermaid,
    "```",
    ``,
    `## 2. Entity catalog`,
    ``,
    ...view.entities.flatMap((entity) => [
      `### ${entity.name}`,
      ``,
      entity.description,
      ``,
      `| Attribute | Type | Key |`,
      `| --- | --- | --- |`,
      ...entity.fields.map(
        (field) => `| ${field.name} | ${field.type} | ${field.key ?? "—"} |`,
      ),
      ``,
    ]),
    `## 3. Relationships`,
    ``,
    ...(view.links.length
      ? [
          `| From | To | Type | Meaning |`,
          `| --- | --- | --- | --- |`,
          ...view.links.map(
            (link) =>
              `| ${link.from} | ${link.to} | ${cell(link.kind)} | ${cell(link.label)} |`,
          ),
        ]
      : ["No relationships were specified."]),
    ``,
    `## 4. Integrity rules`,
    ``,
    `- Every entity has a stable string \`id\` primary key.`,
    `- Foreign keys must point to an existing parent row.`,
    `- Soft-delete is allowed only if a later version needs history. The first version can hard-delete.`,
    `- Do not store secrets or raw tokens in client-visible records.`,
    ...(spec.database?.constraints ?? []).map((item) => `- ${item}`),
    ``,
    `## 5. Suggested first queries`,
    ``,
    ...suggestedQueries(view),
    ``,
  ].join("\n");
}

function detailedFeatures(features: PrdView["features"]): string[] {
  if (features.length === 0) {
    return [
      "No features have been specified yet. The first version should still solve the stated problem with one main flow.",
      ``,
    ];
  }

  return features.flatMap((feature, index) => [
    `### 7.${index + 3} ${feature.name}`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Priority | ${feature.priority} |`,
    `| Status | ${feature.status} |`,
    ``,
    feature.description,
    ``,
    `**User story**`,
    ``,
    `As a user, I want ${feature.name.toLowerCase()} so that ${feature.description.replace(/\.$/, "")}.`,
    ``,
    `**Acceptance criteria**`,
    ``,
    ...(feature.acceptance.length
      ? feature.acceptance.map((item) => `- [ ] ${item}`)
      : [
          `- [ ] A user can complete ${feature.name.toLowerCase()} without leaving the app.`,
          `- [ ] Failure states are visible and recoverable.`,
        ]),
    ``,
    `**Implementation notes**`,
    ``,
    `- Keep this feature isolated from later work.`,
    `- Reuse existing auth and data models.`,
    `- Stop when the acceptance list is true.`,
    ``,
  ]);
}

function journeyNarrative(spec: ProjectSpec, view: PrdView): string {
  const user = view.users[0]?.name ?? spec.project.targetUsers[0] ?? "the user";
  const feature = view.features[0]?.name ?? "the main action";
  return `A typical first session: ${user} signs in, understands the problem in one screen, then completes **${feature}**. If that path is not possible, the first version is not done.`;
}

function prdGoalMermaid(view: PrdView): string {
  const nodes = view.goals.slice(0, 4).map((goal, index) => {
    const id = `G${index + 1}`;
    return `  ${id}["${escapeMermaid(goal)}"]`;
  });
  const edges = nodes.map((_, index) =>
    index === 0 ? `  Product --> G1` : `  G${index} --> G${index + 1}`,
  );
  return ["flowchart TD", `  Product["${escapeMermaid(view.name)}"]`, ...nodes, ...edges].join(
    "\n",
  );
}

function prdJourneyMermaid(spec: ProjectSpec, view: PrdView): string {
  const user = escapeMermaid(view.users[0]?.name ?? spec.project.targetUsers[0] ?? "User");
  const steps = [
    `SignIn["Sign in"]`,
    `Home["Land on home"]`,
    ...view.features.slice(0, 4).map((feature, index) => `F${index}["${escapeMermaid(feature.name)}"]`),
    `Done["Job complete"]`,
  ];
  const ids = ["User", "SignIn", "Home", ...view.features.slice(0, 4).map((_, index) => `F${index}`), "Done"];
  const decls = [`  User["${user}"]`, ...steps.map((step) => `  ${step}`)];
  const edges = ids.slice(1).map((id, index) => `  ${ids[index]} --> ${id}`);
  return ["flowchart LR", ...decls, ...edges].join("\n");
}

function prdFeatureMermaid(view: PrdView): string {
  const lines = ["flowchart TB", `  subgraph Must`, `    direction TB`];
  const must = view.features.filter((feature) => feature.priority === "must");
  const should = view.features.filter((feature) => feature.priority === "should");
  const later = view.features.filter((feature) => feature.priority === "later");
  if (must.length === 0) {
    lines.push(`    EmptyMust["No must features yet"]`);
  } else {
    must.forEach((feature, index) => {
      lines.push(`    M${index}["${escapeMermaid(feature.name)}"]`);
    });
  }
  lines.push(`  end`, `  subgraph Should`, `    direction TB`);
  if (should.length === 0) {
    lines.push(`    EmptyShould["Optional later"]`);
  } else {
    should.forEach((feature, index) => {
      lines.push(`    S${index}["${escapeMermaid(feature.name)}"]`);
    });
  }
  lines.push(`  end`, `  subgraph Later`, `    direction TB`);
  if (later.length === 0) {
    lines.push(`    EmptyLater["Not in v1"]`);
  } else {
    later.forEach((feature, index) => {
      lines.push(`    L${index}["${escapeMermaid(feature.name)}"]`);
    });
  }
  lines.push(`  end`);
  return lines.join("\n");
}

function prdArchitectureMermaid(spec: ProjectSpec): string {
  const web = escapeMermaid(spec.stack?.frontend ?? "Web app");
  const api = escapeMermaid(spec.stack?.backend ?? "Application");
  const db = escapeMermaid(spec.stack?.database ?? "Database");
  const auth = escapeMermaid(spec.stack?.authentication ?? spec.security?.authentication?.[0] ?? "Auth");
  const extras = (spec.architecture?.externalServices ?? []).slice(0, 3);
  return [
    "flowchart LR",
    `  User["User"] --> Web["${web}"]`,
    `  Web --> App["${api}"]`,
    `  App --> DB["${db}"]`,
    `  App --> Auth["${auth}"]`,
    ...extras.map(
      (service, index) => `  App --> X${index}["${escapeMermaid(service.name)}"]`,
    ),
  ].join("\n");
}

function specEntities(spec: ProjectSpec): ErdEntityView[] {
  const extras: ErdEntityView[] = [];
  if (spec.stack?.authentication || spec.security?.authentication?.length) {
    extras.push({
      id: "AuthSession",
      name: "AuthSession",
      description: "Hosted or server-side session for a signed-in user.",
      fields: [
        field("string", "id", "PK"),
        field("string", "userId", "FK"),
        field("datetime", "expiresAt"),
        field("datetime", "createdAt"),
      ],
    });
  }

  const entities = (spec.database?.entities ?? []).map((entity) => {
    const id = mermaidId(entity.name || entity.id);
    return {
      id,
      name: entity.name,
      description: entity.description,
      fields: inferFields(entity.name, entity.description, spec, id),
    };
  });

  return dedupeEntities([...entities, ...extras]);
}

function fallbackEntities(spec: ProjectSpec): ErdEntityView[] {
  const user = spec.users?.[0];
  const userName = user?.name ?? spec.project.targetUsers[0] ?? "User";
  const userId = mermaidId(userName);
  const records = (spec.features ?? []).slice(0, 3).map((feature) => {
    const id = mermaidId(feature.name);
    return {
      id,
      name: titleCase(feature.name),
      description: feature.description,
      fields: inferFields(feature.name, feature.description, spec, id),
    };
  });

  const base: ErdEntityView[] = [
    {
      id: userId,
      name: userName,
      description: user?.description ?? "A person who uses the product.",
      fields: [
        field("string", "id", "PK"),
        field("string", "name"),
        field("string", "email"),
        field("string", "role"),
        field("datetime", "createdAt"),
      ],
    },
  ];

  if (spec.stack?.authentication || spec.security?.authentication?.length) {
    base.push({
      id: "AuthSession",
      name: "AuthSession",
      description: "Sign-in session bound to a user.",
      fields: [
        field("string", "id", "PK"),
        field("string", "userId", "FK"),
        field("datetime", "expiresAt"),
        field("datetime", "createdAt"),
      ],
    });
  }

  if (records.length === 0) {
    base.push({
      id: mermaidId(`${spec.project.name}Record`),
      name: `${spec.project.name} Record`,
      description: "The main record a user creates and reviews.",
      fields: inferFields("Record", spec.project.description, spec, "Record"),
    });
  }

  return dedupeEntities([...base, ...records]);
}

function linksFor(
  spec: ProjectSpec,
  entities: readonly ErdEntityView[],
  entityIds: Set<string>,
): ErdLinkView[] {
  const links: ErdLinkView[] = [];

  for (const rel of spec.database?.relationships ?? []) {
    const from = mermaidId(rel.from);
    const to = mermaidId(rel.to);
    if (!entityIds.has(from) || !entityIds.has(to)) {
      continue;
    }
    links.push({
      from,
      to,
      kind: rel.type,
      label: rel.description ?? rel.type,
    });
  }

  const user = entities.find((entity) => /user|owner|admin|dispatcher|penjaga/i.test(entity.name));
  const session = entities.find((entity) => entity.id === "AuthSession");
  if (user && session) {
    links.push({
      from: user.id,
      to: session.id,
      kind: "one-to-many",
      label: "owns sessions",
    });
  }

  if (links.length === 0) {
    for (const entity of entities) {
      if (user && entity.id !== user.id && entity.id !== "AuthSession") {
        links.push({
          from: user.id,
          to: entity.id,
          kind: "one-to-many",
          label: "creates",
        });
      }
    }
  }

  if (links.length === 0 && entities.length >= 2) {
    links.push({
      from: entities[0]!.id,
      to: entities[1]!.id,
      kind: "one-to-many",
      label: "has",
    });
  }

  return links;
}

function applyRelationshipKeys(
  entities: ErdEntityView[],
  spec: ProjectSpec,
): ErdEntityView[] {
  const rels = spec.database?.relationships ?? [];
  if (rels.length === 0) {
    return entities;
  }

  return entities.map((entity) => {
    const extra: DocField[] = [];
    for (const rel of rels) {
      const from = mermaidId(rel.from);
      const to = mermaidId(rel.to);
      const childId = rel.type.toLowerCase().includes("many-to-one") ? from : to;
      const parentId = childId === from ? to : from;
      if (entity.id !== childId) {
        continue;
      }
      const fk = `${lowerFirst(parentId)}Id`;
      if (!entity.fields.some((item) => item.name === fk)) {
        extra.push(field("string", fk, "FK"));
      }
    }
    return extra.length === 0
      ? entity
      : { ...entity, fields: uniqueFields([...entity.fields, ...extra], entity.id) };
  });
}

function inferFields(
  name: string,
  description: string,
  spec: ProjectSpec,
  entityId: string,
): DocField[] {
  const text = `${name} ${description}`.toLowerCase();
  const fields: DocField[] = [field("string", "id", "PK")];
  const userFk = mermaidId(
    spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? "User",
  );

  if (/user|owner|admin|dispatcher|penjaga|customer/i.test(name)) {
    fields.push(field("string", "name"), field("string", "email"), field("string", "role"));
  } else if (/session|auth/i.test(name)) {
    fields.push(field("string", "userId", "FK"), field("datetime", "expiresAt"));
  } else {
    fields.push(field("string", "title"), field("string", "status"));
    if (spec.users?.length || spec.project.targetUsers.length) {
      fields.push(field("string", `${lowerFirst(userFk)}Id`, "FK"));
    }
  }

  if (/note|comment|message|catat/i.test(text)) {
    fields.push(field("text", "body"));
  }
  if (/visit|schedule|event|appointment/i.test(text)) {
    fields.push(field("datetime", "scheduledAt"));
  }
  if (/price|amount|total|bayar/i.test(text)) {
    fields.push(field("number", "amount"));
  }
  if (/qty|stock|stok|count/i.test(text)) {
    fields.push(field("number", "quantity"));
  }

  fields.push(field("datetime", "createdAt"), field("datetime", "updatedAt"));
  return uniqueFields(fields, entityId);
}

function suggestedQueries(view: ErdView): string[] {
  const first = view.entities[0];
  const second = view.entities[1];
  if (!first) {
    return ["- List the main records for the signed-in user."];
  }

  return [
    `- List ${first.name} rows for the signed-in user, newest first.`,
    second
      ? `- Load a ${first.name} with its related ${second.name} records.`
      : `- Load one ${first.name} by id.`,
    `- Create a ${first.name} in one request and return the created row.`,
  ];
}

function securityLines(spec: ProjectSpec): string[] {
  const lines = [
    ...(spec.security?.authentication ?? []).map((item) => `- Authentication: ${item}`),
    ...(spec.security?.authorization ?? []).map((item) => `- Authorization: ${item}`),
    ...(spec.security?.sensitiveData ?? []).map((item) => `- Sensitive data: ${item}`),
    ...(spec.security?.constraints ?? []).map((item) => `- ${item}`),
  ];
  if (spec.stack?.authentication) {
    lines.unshift(`- Authentication provider: ${spec.stack.authentication}`);
  }
  return lines.length
    ? lines
    : ["- Keep secrets on the server. Do not expose API keys in the client."];
}

function constraintLines(spec: ProjectSpec): string[] {
  const lines = [
    spec.constraints?.budget ? `- Budget: ${spec.constraints.budget}` : "",
    ...(spec.constraints?.deployment ?? []).map((item) => `- Deployment: ${item}`),
    ...(spec.constraints?.technology ?? []).map((item) => `- Technology: ${item}`),
    ...(spec.constraints?.compliance ?? []).map((item) => `- Compliance: ${item}`),
    ...(spec.constraints?.scope ?? []).map((item) => `- Scope: ${item}`),
    ...(spec.architecture?.constraints ?? []).map((item) => `- Architecture: ${item}`),
    "- Anything not listed in the requirements is out of scope for v1.",
    "- Do not add extra platforms, roles, or integrations unless they are specified.",
  ];
  return lines.filter((line) => line.length > 0);
}

function stackItems(spec: ProjectSpec): string[] {
  if (!spec.stack) {
    return [];
  }

  return unique(
    [
      spec.stack.frontend,
      spec.stack.backend,
      spec.stack.database,
      spec.stack.authentication,
      spec.stack.hosting,
      ...(spec.stack.additional ?? []),
    ].filter((item): item is string => Boolean(item)),
  );
}

function field(type: string, name: string, key?: DocField["key"]): DocField {
  return key ? { type, name, key } : { type, name };
}

function uniqueFields(fields: DocField[], _entityId: string): DocField[] {
  const seen = new Set<string>();
  return fields.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}

function dedupeEntities(entities: ErdEntityView[]): ErdEntityView[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    if (seen.has(entity.id)) {
      return false;
    }
    seen.add(entity.id);
    return true;
  });
}

function mermaidId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, "") || "Entity";
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `E${cleaned}`;
}

function mermaidLabel(type: string): string {
  return type.replace(/[^A-Za-z0-9_]+/g, "_").slice(0, 28) || "relates";
}

function mermaidRel(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized.includes("many-to-many") || normalized.includes("m:n")) {
    return "}o--o{";
  }
  if (normalized.includes("one-to-one") || normalized.includes("1:1")) {
    return "||--||";
  }
  if (normalized.includes("many-to-one") || normalized.includes("n:1")) {
    return "}o--||";
  }
  return "||--o{";
}

function escapeMermaid(value: string): string {
  return value.replace(/[[\]"]/g, "").slice(0, 42);
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
