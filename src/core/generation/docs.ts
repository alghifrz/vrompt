import type { Feature, ProjectSpec } from "../schema/project-spec";
import {
  buildDomainModel,
  isPlaceholderApiPath,
  isPlaceholderEntityName,
  isWeakDatabase,
  recommendedFeatures,
  shouldExpandFeatures,
  specLanguage,
  type DomainModel,
  type SpecLanguage,
} from "../spec/domain";
import type { GeneratedFile } from "./types";

export interface DocField {
  readonly type: string;
  readonly name: string;
  readonly key?: "PK" | "FK";
  readonly required?: boolean;
  readonly notes?: string;
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
    features: (shouldExpandFeatures(spec) ? recommendedFeatures(spec) : spec.features ?? []).map(
      (feature) => ({
        name: feature.name,
        description: feature.description,
        priority: feature.priority,
        status: feature.status,
        acceptance: feature.acceptanceCriteria,
      }),
    ),
    stack: stackItems(spec),
    architectureStyle: spec.architecture?.style,
    components: (spec.architecture?.components ?? []).map((item) => item.name),
    endpoints: resolvedEndpoints(spec).map(
      (endpoint) => `${endpoint.method} ${endpoint.path}`,
    ),
  };
}

export function buildErdView(spec: ProjectSpec): ErdView {
  const domain = buildDomainModel(spec);
  const fromSpec = spec.database?.entities ?? [];
  const inferred =
    fromSpec.length === 0 ||
    fromSpec.every((entity) => isPlaceholderEntityName(entity.name)) ||
    isWeakDatabase(spec);
  const raw = inferred ? domainEntities(spec, domain) : specEntities(spec, domain);
  const entities = applyRelationshipKeys(raw, spec, domain);
  const entityIds = new Set(entities.map((entity) => entity.id));
  const links = linksFor(spec, entities, entityIds, domain);

  return {
    inferred,
    entities,
    links,
    notes: [
      inferred
        ? domain.language === "id"
          ? `Model awal untuk ${spec.project.name}, diturunkan dari pengguna dan fitur. Perhalus setelah tabel pertama hidup.`
          : `Starting model for ${spec.project.name}, derived from users and features. Refine after the first tables exist.`
        : domain.language === "id"
          ? `Diambil dari spek database ${spec.project.name}, lalu dilengkapi auth dan relasi yang masuk akal.`
          : `Derived from the ${spec.project.name} database spec, then completed with auth and clear relationships.`,
      ...relevantConstraints(spec.database?.constraints ?? [], spec.project.name),
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
    ...markdownTable(
      copy(spec).controlHeaders,
      [
        [copy(spec).control.product, view.name],
        [copy(spec).control.type, view.type],
        [copy(spec).control.status, spec.project.status],
        [copy(spec).control.audience, spec.project.targetUsers.join(", ")],
        [copy(spec).control.version, "1.0"],
      ],
    ),
    ``,
    copy(spec).sourceOfTruth(view.name),
    ``,
    `## 2. Executive summary`,
    ``,
    view.description,
    ``,
    `**Problem:** ${view.problem}`,
    ``,
    `**${copy(spec).firstOutcome}:** ${view.goals[0] ?? copy(spec).defaultGoal}`,
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
      : copy(spec).defaultSuccess(view)),
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
          copy(spec).missingPersonas(spec.project.targetUsers.join(", ")),
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
    `### 7.1 Feature catalog`,
    ``,
    ...markdownTable(
      copy(spec).featureHeaders,
      view.features.length
        ? view.features.map((feature) => [
            feature.name,
            feature.priority,
            feature.status,
            feature.description,
            feature.acceptance.join("; ") || copy(spec).defaultAcceptance(feature.name),
          ])
        : [copy(spec).emptyFeatureRow],
    ),
    ``,
    `Counts: Must ${String(must.length)} · Should ${String(should.length)} · Later ${String(later.length)}.`,
    ``,
    `### 7.2 Feature map`,
    ``,
    "```mermaid",
    prdFeatureMermaid(spec, view),
    "```",
    ``,
    ...detailedFeatures(spec, view.features),
    `## 8. Experience notes`,
    ``,
    ...copy(spec).experience(view),
    ``,
    `## 9. Technical design`,
    ``,
    `### 9.1 Stack`,
    ``,
    ...(view.stack.length
      ? markdownTable(copy(spec).stackHeaders, stackRows(spec, specLanguage(spec)))
      : [copy(spec).stackOpen]),
    ``,
    `### 9.2 Architecture`,
    ``,
    view.architectureStyle
      ? `Style: ${view.architectureStyle}.`
      : copy(spec).defaultArchitecture,
    ``,
    ...(spec.architecture?.components?.length
      ? spec.architecture.components.map(
          (component) => `- **${component.name}:** ${component.description}`,
        )
      : []),
    ...(relevantConstraints(spec.architecture?.constraints ?? [], spec.project.name).length
      ? [
          "",
          copy(spec).constraintsLabel,
          ...relevantConstraints(spec.architecture?.constraints ?? [], spec.project.name).map(
            (item) => `- ${item}`,
          ),
        ]
      : []),
    ``,
    "```mermaid",
    prdArchitectureMermaid(spec),
    "```",
    ``,
    `### 9.3 API`,
    ``,
    ...(resolvedEndpoints(spec).length
      ? markdownTable(
          copy(spec).apiHeaders,
          resolvedEndpoints(spec).map((endpoint) => [
            endpoint.method,
            endpoint.path,
            endpoint.purpose,
            endpoint.authRequired ? copy(spec).authRequired : copy(spec).authPublic,
          ]),
        )
      : [copy(spec).noApi]),
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
    ...copy(spec).openQuestions(view),
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
    copy(spec).erdIntro(spec.project.name),
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
      ...markdownTable(
        copy(spec).erdFieldHeaders,
        entity.fields.map((item) => [
          item.name,
          item.type,
          item.key ?? "—",
          item.required === false ? copy(spec).no : copy(spec).yes,
          item.notes ?? "—",
        ]),
      ),
      ``,
    ]),
    `## 3. Relationships`,
    ``,
    ...(view.links.length
      ? markdownTable(
          copy(spec).erdRelHeaders,
          view.links.map((link) => [link.from, link.to, link.kind, link.label]),
        )
      : [copy(spec).noRelationships]),
    ``,
    `## 4. Integrity rules`,
    ``,
    ...copy(spec).integrity,
    ...relevantConstraints(spec.database?.constraints ?? [], spec.project.name).map(
      (item) => `- ${item}`,
    ),
    ``,
    `## 5. Suggested first queries`,
    ``,
    ...suggestedQueries(spec, view),
    ``,
  ].join("\n");
}

function detailedFeatures(spec: ProjectSpec, features: PrdView["features"]): string[] {
  const words = copy(spec);
  if (features.length === 0) {
    return [words.noFeatures, ``];
  }

  const domain = buildDomainModel(spec);
  return features.flatMap((feature, index) => [
    `### 7.${index + 3} ${feature.name}`,
    ``,
    `${feature.priority} · ${feature.status}`,
    ``,
    feature.description,
    ``,
    `**${words.userStory}**`,
    ``,
    words.story(feature, viewActor(spec)),
    ``,
    `**${words.acceptance}**`,
    ``,
    ...(feature.acceptance.length
      ? feature.acceptance.map((item) => `- [ ] ${item}`)
      : words.defaultAcceptanceList(feature.name)),
    ``,
    `**${words.flow}**`,
    ``,
    ...words.featureFlow(feature.name, domain),
    ``,
    `**${words.implNotes}**`,
    ``,
    ...words.featureNotes(feature.name, domain),
    ``,
  ]);
}

function journeyNarrative(spec: ProjectSpec, view: PrdView): string {
  const user = view.users[0]?.name ?? spec.project.targetUsers[0] ?? viewActor(spec);
  const feature = view.features[0]?.name ?? copy(spec).mainAction;
  return copy(spec).journey(user, feature);
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
  const user = escapeMermaid(view.users[0]?.name ?? spec.project.targetUsers[0] ?? viewActor(spec));
  const labels = copy(spec).journeyLabels;
  const steps = [
    `SignIn["${labels.signIn}"]`,
    `Home["${labels.home}"]`,
    ...view.features.slice(0, 4).map((feature, index) => `F${index}["${escapeMermaid(feature.name)}"]`),
    `Done["${labels.done}"]`,
  ];
  const ids = ["User", "SignIn", "Home", ...view.features.slice(0, 4).map((_, index) => `F${index}`), "Done"];
  const decls = [`  User["${user}"]`, ...steps.map((step) => `  ${step}`)];
  const edges = ids.slice(1).map((id, index) => `  ${ids[index]} --> ${id}`);
  return ["flowchart LR", ...decls, ...edges].join("\n");
}

function prdFeatureMermaid(spec: ProjectSpec, view: PrdView): string {
  const labels = copy(spec).featureBuckets;
  const lines = ["flowchart TB", `  subgraph ${labels.must}`, `    direction TB`];
  const must = view.features.filter((feature) => feature.priority === "must");
  const should = view.features.filter((feature) => feature.priority === "should");
  const later = view.features.filter((feature) => feature.priority === "later");
  if (must.length === 0) {
    lines.push(`    EmptyMust["${labels.mustEmpty}"]`);
  } else {
    must.forEach((feature, index) => {
      lines.push(`    M${index}["${escapeMermaid(feature.name)}"]`);
    });
  }
  lines.push(`  end`, `  subgraph ${labels.should}`, `    direction TB`);
  if (should.length === 0) {
    lines.push(`    EmptyShould["${labels.shouldEmpty}"]`);
  } else {
    should.forEach((feature, index) => {
      lines.push(`    S${index}["${escapeMermaid(feature.name)}"]`);
    });
  }
  lines.push(`  end`, `  subgraph ${labels.later}`, `    direction TB`);
  if (later.length === 0) {
    lines.push(`    EmptyLater["${labels.laterEmpty}"]`);
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

function specEntities(spec: ProjectSpec, domain: DomainModel): ErdEntityView[] {
  const entities: ErdEntityView[] = (spec.database?.entities ?? [])
    .filter((entity) => !isPlaceholderEntityName(entity.name))
    .map((entity) => {
      const noun = matchNoun(entity.name, domain);
      return {
        id: mermaidId(entity.name || entity.id),
        name: entity.name,
        description: entity.description,
        fields: noun
          ? fieldsForNoun(noun, domain)
          : inferFields(entity.name, entity.description, domain),
      };
    });

  if (hasAuth(spec)) {
    entities.push(authSessionEntity(domain));
  }

  return dedupeEntities(entities);
}

function domainEntities(spec: ProjectSpec, domain: DomainModel): ErdEntityView[] {
  const nouns =
    domain.entities.length > 0
      ? domain.entities
      : [domain.actor, domain.subject, domain.record].filter(
          (noun): noun is NonNullable<typeof noun> => Boolean(noun),
        );
  const entities: ErdEntityView[] = nouns.map((noun) => ({
    id: mermaidId(noun.name),
    name: noun.name,
    description: noun.description,
    fields: fieldsForNoun(noun, domain),
  }));

  if (hasAuth(spec)) {
    entities.push(authSessionEntity(domain));
  }

  return dedupeEntities(entities);
}

function linksFor(
  spec: ProjectSpec,
  entities: readonly ErdEntityView[],
  entityIds: Set<string>,
  domain: DomainModel,
): ErdLinkView[] {
  const links: ErdLinkView[] = [];
  const specRels = usableRelationships(spec);

  for (const rel of specRels) {
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

  if (specRels.length === 0) {
    for (const rel of domainRelationships(domain)) {
      const from = mermaidId(rel.from);
      const to = mermaidId(rel.to);
      if (!entityIds.has(from) || !entityIds.has(to)) {
        continue;
      }
      links.push(rel);
    }
  }

  const actor = entities.find((entity) => entity.id === mermaidId(domain.actor.name));
  const session = entities.find((entity) => entity.id === "AuthSession");
  if (actor && session && !links.some((link) => link.to === session.id)) {
    links.push({
      from: actor.id,
      to: session.id,
      kind: "one-to-many",
      label: domain.language === "id" ? "punya sesi login" : "owns sessions",
    });
  }

  return links;
}

function applyRelationshipKeys(
  entities: ErdEntityView[],
  spec: ProjectSpec,
  domain: DomainModel,
): ErdEntityView[] {
  const specRels = usableRelationships(spec);
  const rels =
    specRels.length > 0
      ? specRels.map((rel) => ({
          from: rel.from,
          to: rel.to,
          type: rel.type,
          description: rel.description,
        }))
      : domainRelationships(domain).map((rel) => ({
          from: rel.from,
          to: rel.to,
          type: rel.kind,
          description: rel.label,
        }));

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
      if (!entity.fields.some((item) => item.name === fk || item.name === `${parentId}Id`)) {
        extra.push(
          field("string", fk, {
            key: "FK",
            notes:
              domain.language === "id"
                ? `Mengacu ke ${parentId}.id.`
                : `References ${parentId}.id.`,
          }),
        );
      }
    }
    return extra.length === 0
      ? entity
      : { ...entity, fields: uniqueFields([...entity.fields, ...extra], entity.id) };
  });
}

function fieldsForNoun(
  noun: DomainModel["actor"],
  domain: DomainModel,
): DocField[] {
  const idNotes = domain.language === "id";
  const actorId = mermaidId(domain.actor.name);

  if (noun.kind === "actor") {
    return uniqueFields(
      [
        field("string", "id", {
          key: "PK",
          notes: idNotes ? `Kunci utama ${noun.name}.` : `Primary key for ${noun.name}.`,
        }),
        field("string", "name", {
          notes: idNotes ? `Nama lengkap ${noun.name.toLowerCase()}.` : "Display name.",
        }),
        field("string", "email", {
          notes: idNotes ? "Email untuk masuk." : "Unique sign-in email.",
        }),
        field("string", "role", {
          notes: idNotes ? "Peran di aplikasi." : "Application role.",
        }),
        field("datetime", "createdAt", {
          notes: idNotes ? "Waktu baris dibuat." : "Row created at.",
        }),
        field("datetime", "updatedAt", {
          notes: idNotes ? "Waktu terakhir diubah." : "Last update time.",
        }),
      ],
      noun.id,
    );
  }

  if (noun.kind === "subject" || noun.kind === "supporting") {
    return uniqueFields(
      [
        field("string", "id", {
          key: "PK",
          notes: idNotes ? `Kunci utama ${noun.name}.` : `Primary key for ${noun.name}.`,
        }),
        field("string", "name", {
          notes: idNotes ? `Nama ${noun.name.toLowerCase()}.` : `${noun.name} display name.`,
        }),
        field("string", "status", {
          required: false,
          notes: idNotes ? "Status baris ini, jika dipakai." : "Optional row status.",
        }),
        field("datetime", "createdAt", {
          notes: idNotes ? "Waktu baris dibuat." : "Row created at.",
        }),
        field("datetime", "updatedAt", {
          notes: idNotes ? "Waktu terakhir diubah." : "Last update time.",
        }),
      ],
      noun.id,
    );
  }

  if (noun.kind === "record") {
    const subjectId = domain.subject ? mermaidId(domain.subject.name) : undefined;
    return uniqueFields(
      [
        field("string", "id", {
          key: "PK",
          notes: idNotes ? `Kunci utama ${noun.name}.` : `Primary key for ${noun.name}.`,
        }),
        ...(subjectId
          ? [
              field("string", `${lowerFirst(subjectId)}Id`, {
                key: "FK" as const,
                notes: idNotes
                  ? `Mengacu ke ${subjectId}.id.`
                  : `References ${subjectId}.id.`,
              }),
            ]
          : []),
        field("string", `${lowerFirst(actorId)}Id`, {
          key: "FK",
          notes: idNotes
            ? `Mengacu ke ${actorId}.id.`
            : `References ${actorId}.id.`,
        }),
        field("string", "status", {
          notes: idNotes ? `Status ${noun.name.toLowerCase()}.` : `${noun.name} status.`,
        }),
        field("datetime", "createdAt", {
          notes: idNotes ? "Waktu baris dibuat." : "Row created at.",
        }),
        field("datetime", "updatedAt", {
          notes: idNotes ? "Waktu terakhir diubah." : "Last update time.",
        }),
      ],
      noun.id,
    );
  }

  return inferFields(noun.name, noun.description, domain);
}

function inferFields(
  name: string,
  description: string,
  domain: DomainModel,
): DocField[] {
  const text = `${name} ${description}`.toLowerCase();
  const idNotes = domain.language === "id";
  const fields: DocField[] = [
    field("string", "id", {
      key: "PK",
      notes: idNotes ? `Kunci utama ${titleCase(name)}.` : `Primary key for ${titleCase(name)}.`,
    }),
  ];
  const actorId = mermaidId(domain.actor.name);

  if (/user|owner|admin|dispatcher|penjaga|customer|guru|teacher/i.test(name)) {
    fields.push(
      field("string", "name", {
        notes: idNotes ? "Nama tampilan." : "Display name.",
      }),
      field("string", "email", {
        notes: idNotes ? "Email unik untuk masuk." : "Unique sign-in email.",
      }),
      field("string", "role", {
        notes: idNotes ? "Peran di aplikasi." : "Application role.",
      }),
    );
  } else if (/session|auth/i.test(name)) {
    fields.push(
      field("string", "userId", {
        key: "FK",
        notes: idNotes ? `Mengacu ke ${actorId}.id.` : `References ${actorId}.id.`,
      }),
      field("datetime", "expiresAt", {
        notes: idNotes ? "Kapan sesi tidak berlaku." : "When the session stops being valid.",
      }),
    );
  } else {
    fields.push(
      field("string", "title", {
        notes: idNotes ? "Label singkat di daftar." : "Short label shown in lists.",
      }),
      field("string", "status", {
        notes: idNotes
          ? "Status siklus, misalnya direncanakan atau selesai."
          : "Lifecycle state, for example planned or done.",
      }),
      field("string", `${lowerFirst(actorId)}Id`, {
        key: "FK",
        notes: idNotes
          ? `Mengacu ke ${actorId}.id. Pemilik ${titleCase(name)}.`
          : `References ${actorId}.id. Owner of this ${titleCase(name)}.`,
      }),
    );
  }

  if (/note|comment|message|catat/i.test(text)) {
    fields.push(
      field("text", "body", {
        notes: idNotes ? "Isi tulisan utama." : "Main written content.",
      }),
    );
  }
  if (/visit|schedule|event|appointment|kunjung/i.test(text)) {
    fields.push(
      field("datetime", "scheduledAt", {
        notes: idNotes ? "Kapan catatan ini terjadi." : "When this record happens.",
      }),
    );
  }
  if (/price|amount|total|bayar/i.test(text)) {
    fields.push(
      field("number", "amount", {
        notes: idNotes ? "Nilai uang." : "Money value in the project currency.",
      }),
    );
  }
  if (/qty|stock|stok|count/i.test(text)) {
    fields.push(
      field("number", "quantity", {
        notes: idNotes ? "Jumlah yang dihitung." : "Countable amount.",
      }),
    );
  }

  fields.push(
    field("datetime", "createdAt", {
      notes: idNotes ? "Waktu baris dibuat." : "Row created at.",
    }),
    field("datetime", "updatedAt", {
      notes: idNotes ? "Waktu terakhir diubah." : "Last update time.",
    }),
  );
  return uniqueFields(fields, mermaidId(name));
}

function suggestedQueries(spec: ProjectSpec, view: ErdView): string[] {
  const domain = buildDomainModel(spec);
  const actor = view.entities.find((entity) => entity.id === mermaidId(domain.actor.name));
  const record = view.entities.find((entity) => entity.id === mermaidId(domain.record.name));
  const subjectNoun = domain.subject;
  const subject = subjectNoun
    ? view.entities.find((entity) => entity.id === mermaidId(subjectNoun.name))
    : undefined;
  const words = copy(spec);

  if (!record && !view.entities[0]) {
    return [words.queryFallback];
  }

  const main = record ?? view.entities[0]!;
  const related = subject ?? view.entities.find((entity) => entity.id !== main.id);

  return words.queries(main.name, related?.name, actor?.name ?? domain.actor.name);
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
  const words = copy(spec);
  const lines = [
    spec.constraints?.budget ? `- Budget: ${spec.constraints.budget}` : "",
    ...(spec.constraints?.deployment ?? []).map((item) => `- Deployment: ${item}`),
    ...(spec.constraints?.technology ?? []).map((item) => `- Technology: ${item}`),
    ...(spec.constraints?.compliance ?? []).map((item) => `- Compliance: ${item}`),
    ...(spec.constraints?.scope ?? []).map((item) => `- Scope: ${item}`),
    ...relevantConstraints(spec.architecture?.constraints ?? [], spec.project.name).map(
      (item) => `- ${words.architectureLabel} ${item}`,
    ),
    words.outOfScope,
    words.noExtraPlatforms,
  ];
  return lines.filter((line) => line.length > 0);
}

function resolvedEndpoints(spec: ProjectSpec): Array<{
  method: string;
  path: string;
  purpose: string;
  authRequired: boolean;
}> {
  const existing = spec.api?.endpoints ?? [];
  if (existing.length === 0 || existing.every((endpoint) => isPlaceholderApiPath(endpoint.path))) {
    return [...buildDomainModel(spec).endpoints];
  }
  return existing;
}

function relevantConstraints(items: readonly string[], projectName: string): string[] {
  return items.filter((item) => {
    if (/TaskFlow/i.test(item) && !/taskflow/i.test(projectName)) {
      return false;
    }
    if (/Keep .+ as one app until a second surface is real/i.test(item)) {
      return false;
    }
    return item.trim().length > 0;
  });
}

function hasAuth(spec: ProjectSpec): boolean {
  return Boolean(spec.stack?.authentication || spec.security?.authentication?.length);
}

function matchNoun(name: string, domain: DomainModel): DomainModel["actor"] | undefined {
  const id = mermaidId(name);
  return [domain.actor, domain.subject, domain.record].find(
    (noun) => noun && mermaidId(noun.name) === id,
  );
}

function authSessionEntity(domain: DomainModel): ErdEntityView {
  const actorId = mermaidId(domain.actor.name);
  const idNotes = domain.language === "id";
  return {
    id: "AuthSession",
    name: "AuthSession",
    description: idNotes
      ? `Sesi masuk milik ${domain.actor.name}.`
      : `Sign-in session bound to ${domain.actor.name}.`,
    fields: [
      field("string", "id", {
        key: "PK",
        notes: idNotes ? "Id sesi yang stabil." : "Stable session id.",
      }),
      field("string", "userId", {
        key: "FK",
        notes: idNotes
          ? `Mengacu ke ${actorId}.id.`
          : `References ${actorId}.id.`,
      }),
      field("datetime", "expiresAt", {
        notes: idNotes ? "Kapan sesi tidak berlaku." : "When the session stops being valid.",
      }),
      field("datetime", "createdAt", {
        notes: idNotes ? "Kapan sesi dimulai." : "When the session started.",
      }),
    ],
  };
}

function usableRelationships(
  spec: ProjectSpec,
): NonNullable<NonNullable<ProjectSpec["database"]>["relationships"]> {
  return (spec.database?.relationships ?? []).filter(
    (rel) => !isPlaceholderEntityName(rel.from) && !isPlaceholderEntityName(rel.to),
  );
}

function domainRelationships(domain: DomainModel): ErdLinkView[] {
  if (domain.relationships.length > 0) {
    return domain.relationships.map((rel) => ({
      from: mermaidId(rel.from),
      to: mermaidId(rel.to),
      kind: rel.type,
      label: rel.description,
    }));
  }

  const id = domain.language === "id";
  const links: ErdLinkView[] = [];
  if (domain.subject) {
    links.push({
      from: mermaidId(domain.subject.name),
      to: mermaidId(domain.record.name),
      kind: "one-to-many",
      label: id
        ? `punya banyak ${domain.record.name}`
        : `has many ${domain.record.name} rows`,
    });
  }
  links.push({
    from: mermaidId(domain.actor.name),
    to: mermaidId(domain.record.name),
    kind: "one-to-many",
    label: id ? `mencatat ${domain.record.name}` : `creates ${domain.record.name} rows`,
  });
  return links;
}

function viewActor(spec: ProjectSpec): string {
  return spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? buildDomainModel(spec).actor.name;
}

function copy(spec: ProjectSpec) {
  const language = specLanguage(spec);
  const id = language === "id";

  return {
    sourceOfTruth: (name: string) =>
      id
        ? `PRD ini adalah sumber kebenaran produk untuk ${name}. File coding-agent harus mengikutinya. Jangan menambah lingkup sendiri.`
        : `This PRD is the product source of truth for ${name}. Generated coding-agent files must follow it. Do not invent scope.`,
    firstOutcome: id ? "Hasil pertama" : "First outcome",
    defaultGoal: id
      ? "Kirim versi pertama yang bisa dipakai."
      : "Ship a usable first version.",
    defaultSuccess: (view: PrdView) => [
      id
        ? `- ${view.users[0]?.name ?? "Pengguna baru"} bisa menyelesaikan pekerjaan utama tanpa setup tambahan.`
        : `- A first-time user can complete the main job without extra setup.`,
    ],
    missingPersonas: (audience: string) =>
      id
        ? `Persona belum diisi. Anggap audiens utamanya: ${audience}.`
        : `Detailed personas are not specified yet. Treat the primary audience as: ${audience}.`,
    defaultAcceptance: (name: string) =>
      id
        ? `Pengguna bisa menyelesaikan ${name} di dalam aplikasi.`
        : `User can finish this flow in-app.`,
    experience: (view: PrdView) =>
      id
        ? [
            `- Layar pertama menjelaskan ${view.name} dalam satu halaman.`,
            `- State kosong harus memberitahu guru atau pengguna apa yang dikerjakan berikutnya.`,
            `- Error harus bisa diperbaiki tanpa kehilangan data yang sudah diisi.`,
            `- Versi pertama cukup kecil untuk didemo dari masuk sampai pekerjaan selesai.`,
          ]
        : [
            `- First-run experience should explain ${view.name} in one screen.`,
            `- Empty states should tell the user what to do next.`,
            `- Errors should be recoverable without losing work.`,
            `- The first version stays small enough to demo end-to-end.`,
          ],
    defaultArchitecture: id
      ? "Mulai sebagai satu aplikasi yang bisa di-deploy sampai permukaan kedua benar-benar dibutuhkan."
      : "Start as one deployable app until a second surface is real.",
    constraintsLabel: id ? "Batasan:" : "Constraints:",
    authRequired: id ? "Wajib masuk" : "Required",
    authPublic: id ? "Publik" : "Public",
    noApi: id
      ? "Belum ada API publik untuk versi pertama."
      : "No public API is specified for the first version.",
    openQuestions: (view: PrdView) =>
      id
        ? [
            `- Apa jalur demo terkecil yang ${view.users[0]?.name ?? "pengguna baru"} harus selesai dalam satu kali duduk?`,
            `- Fitur mana yang boleh ditunda jika versi pertama molor?`,
            `- Data apa yang tidak boleh keluar dari server?`,
          ]
        : [
            `- What is the smallest demo path a new user should finish in one sitting?`,
            `- Which feature can wait if the first version slips?`,
            `- What data must never leave the server?`,
          ],
    erdIntro: (name: string) =>
      id
        ? `Model data logis untuk **${name}**. Pakai ini saat membuat tabel, tipe, dan payload API.`
        : `Logical data model for **${name}**. Use this when creating tables, types, and API payloads.`,
    noRelationships: id
      ? "Belum ada relasi yang masuk akal."
      : "No relationships were specified.",
    integrity: id
      ? [
          `- Setiap entitas punya kunci utama \`id\` berupa string yang stabil.`,
          `- Foreign key harus menunjuk ke baris induk yang ada.`,
          `- Soft-delete hanya jika versi berikutnya butuh riwayat. Versi pertama boleh hard-delete.`,
          `- Jangan simpan rahasia atau token mentah di data yang terlihat klien.`,
        ]
      : [
          `- Every entity has a stable string \`id\` primary key.`,
          `- Foreign keys must point to an existing parent row.`,
          `- Soft-delete is allowed only if a later version needs history. The first version can hard-delete.`,
          `- Do not store secrets or raw tokens in client-visible records.`,
        ],
    queryFallback: id
      ? "- Ambil data utama untuk pengguna yang sudah masuk."
      : "- List the main records for the signed-in user.",
    queries: (main: string, related: string | undefined, actor: string) =>
      id
        ? [
            `- Daftar ${main} milik ${actor} yang sudah masuk, terbaru di atas.`,
            related
              ? `- Ambil satu ${main} beserta ${related} terkait.`
              : `- Ambil satu ${main} berdasarkan id.`,
            `- Buat ${main} dalam satu request dan kembalikan baris yang baru dibuat.`,
          ]
        : [
            `- List ${main} rows for the signed-in ${actor}, newest first.`,
            related
              ? `- Load a ${main} with its related ${related} records.`
              : `- Load one ${main} by id.`,
            `- Create a ${main} in one request and return the created row.`,
          ],
    noFeatures: id
      ? "Fitur belum diisi. Versi pertama tetap harus menyelesaikan masalah utama dengan satu alur."
      : "No features have been specified yet. The first version should still solve the stated problem with one main flow.",
    userStory: id ? "Cerita pengguna" : "User story",
    acceptance: id ? "Kriteria penerimaan" : "Acceptance criteria",
    flow: id ? "Alur kerja" : "Working flow",
    implNotes: id ? "Catatan implementasi" : "Implementation notes",
    mainAction: id ? "pekerjaan utama" : "the main action",
    featureHeaders: id
      ? ["Fitur", "Prioritas", "Status", "Fungsinya", "Penerimaan"]
      : ["Feature", "Priority", "Status", "What it does", "Acceptance"],
    emptyFeatureRow: id
      ? ["—", "must", "planned", "Fitur belum diisi.", "—"]
      : ["—", "must", "planned", "No features specified yet.", "—"],
    story: (feature: PrdView["features"][number], actor: string) =>
      id
        ? `Sebagai ${titleCase(actor)}, saya ingin ${feature.name.toLowerCase()} supaya ${softenPurpose(feature.description)}.`
        : `As ${actor}, I want ${feature.name} so that ${softenPurpose(feature.description)}.`,
    defaultAcceptanceList: (name: string) =>
      id
        ? [
            `- [ ] ${name} bisa diselesaikan tanpa keluar dari aplikasi.`,
            `- [ ] Jika gagal, pesan kesalahan terlihat dan data yang sudah diisi tidak hilang.`,
          ]
        : [
            `- [ ] A user can complete ${name} without leaving the app.`,
            `- [ ] Failure states are visible and recoverable.`,
          ],
    featureFlow: (name: string, domain: DomainModel) =>
      featureFlowLines(name, domain),
    featureNotes: (name: string, domain: DomainModel) =>
      featureNoteLines(name, domain),
    journey: (user: string, feature: string) =>
      id
        ? `Sesi pertama yang wajar: ${user} masuk, memahami masalah di satu layar, lalu menyelesaikan **${feature}**. Jika jalur itu tidak bisa, versi pertama belum selesai.`
        : `A typical first session: ${user} signs in, understands the problem in one screen, then completes **${feature}**. If that path is not possible, the first version is not done.`,
    journeyLabels: id
      ? { signIn: "Masuk", home: "Buka beranda", done: "Selesai" }
      : { signIn: "Sign in", home: "Land on home", done: "Job complete" },
    architectureLabel: id ? "Arsitektur:" : "Architecture:",
    outOfScope: id
      ? "- Apa pun yang tidak ada di persyaratan, di luar lingkup v1."
      : "- Anything not listed in the requirements is out of scope for v1.",
    controlHeaders: id ? ["Kolom", "Isi"] : ["Field", "Value"],
    control: id
      ? {
          product: "Produk",
          type: "Jenis",
          status: "Status",
          audience: "Audiens",
          version: "Versi",
        }
      : {
          product: "Product",
          type: "Type",
          status: "Status",
          audience: "Audience",
          version: "Version",
        },
    stackHeaders: id ? ["Lapisan", "Pilihan"] : ["Layer", "Choice"],
    stackOpen: id
      ? "- Stack masih terbuka. Lebih baik satu aplikasi dan tools yang familiar."
      : "- Stack is still open. Prefer one app and familiar tools.",
    apiHeaders: id
      ? ["Method", "Path", "Tujuan", "Auth"]
      : ["Method", "Path", "Purpose", "Auth"],
    erdFieldHeaders: id
      ? ["Atribut", "Tipe", "Kunci", "Wajib", "Catatan"]
      : ["Attribute", "Type", "Key", "Required", "Notes"],
    erdRelHeaders: id
      ? ["Induk", "Anak", "Kardinalitas", "Arti"]
      : ["Parent", "Child", "Cardinality", "Meaning"],
    yes: id ? "Ya" : "Yes",
    no: id ? "Tidak" : "No",
    noExtraPlatforms: id
      ? "- Jangan menambah platform, peran, atau integrasi kecuali sudah tertulis."
      : "- Do not add extra platforms, roles, or integrations unless they are specified.",
    featureBuckets: id
      ? {
          must: "Wajib",
          should: "Sebaiknya",
          later: "Nanti",
          mustEmpty: "Belum ada fitur wajib",
          shouldEmpty: "Opsional nanti",
          laterEmpty: "Tidak masuk v1",
        }
      : {
          must: "Must",
          should: "Should",
          later: "Later",
          mustEmpty: "No must features yet",
          shouldEmpty: "Optional later",
          laterEmpty: "Not in v1",
        },
  };
}

function softenPurpose(description: string): string {
  return description
    .replace(/^(fitur untuk|a feature to|the feature to|feature to)\s+/i, "")
    .replace(/\.$/, "")
    .replace(/^([A-Z])/, (letter) => letter.toLowerCase());
}

function featureFlowLines(name: string, domain: DomainModel): string[] {
  if (domain.language === "id") {
    return [
      `- ${domain.actor.name} masuk dan melihat daftar ${domain.record.name}.`,
      `- ${domain.actor.name} menjalankan **${name}** pada data yang relevan.`,
      `- Sistem menyimpan hasilnya dan menampilkan konfirmasi yang jelas.`,
    ];
  }
  return [
    `- ${domain.actor.name} signs in and sees the ${domain.record.name} list.`,
    `- ${domain.actor.name} completes **${name}** on the relevant records.`,
    `- The app saves the result and shows a clear confirmation.`,
  ];
}

function featureNoteLines(name: string, domain: DomainModel): string[] {
  if (domain.language === "id") {
    return [
      `- Kerjakan hanya **${name}**. Jangan campur fitur berikutnya.`,
      `- Pakai model ${[domain.actor.name, domain.subject?.name, domain.record.name].filter(Boolean).join(", ")}.`,
      `- Jangan membuat entitas Item atau endpoint /api/items.`,
      `- Berhenti ketika kriteria penerimaan terpenuhi.`,
    ];
  }
  return [
    `- Implement only **${name}**. Do not start the next feature.`,
    `- Reuse ${[domain.actor.name, domain.subject?.name, domain.record.name].filter(Boolean).join(", ")}.`,
    `- Do not invent an Item entity or /api/items.`,
    `- Stop when the acceptance list is true.`,
  ];
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

function stackRows(spec: ProjectSpec, language: SpecLanguage = "en"): string[][] {
  if (!spec.stack) {
    return [];
  }

  const labels =
    language === "id"
      ? {
          frontend: "Frontend",
          backend: "Backend",
          database: "Database",
          authentication: "Autentikasi",
          hosting: "Hosting",
          additional: "Tambahan",
        }
      : {
          frontend: "Frontend",
          backend: "Backend",
          database: "Database",
          authentication: "Authentication",
          hosting: "Hosting",
          additional: "Additional",
        };

  return (
    [
      [labels.frontend, spec.stack.frontend],
      [labels.backend, spec.stack.backend],
      [labels.database, spec.stack.database],
      [labels.authentication, spec.stack.authentication],
      [labels.hosting, spec.stack.hosting],
      ...(spec.stack.additional ?? []).map((item) => [labels.additional, item] as const),
    ] as const
  )
    .filter((row): row is readonly [string, string] => Boolean(row[1]))
    .map(([layer, choice]) => [layer, choice]);
}

function markdownTable(headers: readonly string[], rows: readonly (readonly string[])[]): string[] {
  const widths = headers.map((header, index) =>
    Math.max(header.length, 3, ...rows.map((row) => cell(row[index] ?? "").length)),
  );
  const format = (values: readonly string[]) =>
    `| ${values.map((value, index) => cell(value).padEnd(widths[index]!)).join(" | ")} |`;

  return [
    format(headers),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...rows.map((row) => format(headers.map((_, index) => row[index] ?? ""))),
  ];
}

function field(
  type: string,
  name: string,
  extra: { key?: DocField["key"]; required?: boolean; notes?: string } = {},
): DocField {
  return {
    type,
    name,
    required: extra.required ?? true,
    ...(extra.key ? { key: extra.key } : {}),
    ...(extra.notes ? { notes: extra.notes } : {}),
  };
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
