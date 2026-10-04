import {
  AIRuleSchema,
  ArchitectureComponentSchema,
  DatabaseEntitySchema,
  ExternalServiceSchema,
  FeatureSchema,
  GoalSchema,
  UserTypeSchema,
} from "../schema/project-spec";

const EXTRACTION_KEYS = ["patch", "skip", "confirm", "clarify"] as const;
const PATCH_KEYS = [
  "project",
  "goals",
  "features",
  "users",
  "stack",
  "architecture",
  "database",
  "api",
  "security",
  "constraints",
  "aiRules",
] as const;
const PROJECT_KEYS = [
  "name",
  "description",
  "problem",
  "targetUsers",
  "type",
  "status",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(
  value: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in value) {
      next[key] = value[key];
    }
  }
  return next;
}

function nonEmptyStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "string") {
      return [];
    }
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });
}

function slugId(prefix: string, label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug ? `${prefix}-${slug}` : `${prefix}-${index + 1}`;
}

function softenItems<T>(
  value: unknown,
  prefix: string,
  parse: (item: unknown) => { success: true; data: T } | { success: false },
  labelOf: (item: Record<string, unknown>) => string,
): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const items: T[] = [];

  for (const [index, raw] of value.entries()) {
    if (!isRecord(raw)) {
      continue;
    }

    const item = { ...raw };
    const label = labelOf(item);
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : slugId(prefix, label, index);
    if (seen.has(id)) {
      continue;
    }

    const parsed = parse({ ...item, id });
    if (!parsed.success) {
      continue;
    }

    seen.add(id);
    items.push(parsed.data);
  }

  return items.length > 0 ? items : undefined;
}

function softenGoals(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const primary = softenItems(
    value.primary,
    "goal",
    (item) => GoalSchema.safeParse(item),
    (item) => (typeof item.statement === "string" ? item.statement : ""),
  );
  if (!primary) {
    return undefined;
  }

  return {
    primary,
    successCriteria: nonEmptyStrings(value.successCriteria),
  };
}

function softenProject(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const project = pick(value, PROJECT_KEYS);
  if (Array.isArray(project.targetUsers)) {
    const users = nonEmptyStrings(project.targetUsers);
    if (users.length > 0) {
      project.targetUsers = users;
    } else {
      delete project.targetUsers;
    }
  }

  for (const key of ["name", "description", "problem", "type"] as const) {
    if (typeof project[key] === "string" && project[key].trim() === "") {
      delete project[key];
    }
  }

  return Object.keys(project).length > 0 ? project : undefined;
}

function softenPatch(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const patch = pick(value, PATCH_KEYS);
  const project = softenProject(patch.project);
  if (project) {
    patch.project = project;
  } else {
    delete patch.project;
  }

  const goals = softenGoals(patch.goals);
  if (goals) {
    patch.goals = goals;
  } else {
    delete patch.goals;
  }

  const features = softenItems(
    patch.features,
    "feature",
    (item) => FeatureSchema.safeParse(item),
    (item) => (typeof item.name === "string" ? item.name : ""),
  );
  if (features) {
    patch.features = features;
  } else {
    delete patch.features;
  }

  const users = softenItems(
    patch.users,
    "user",
    (item) => UserTypeSchema.safeParse(item),
    (item) => (typeof item.name === "string" ? item.name : ""),
  );
  if (users) {
    patch.users = users;
  } else {
    delete patch.users;
  }

  if (Array.isArray(patch.aiRules)) {
    patch.aiRules =
      softenItems(
        patch.aiRules,
        "rule",
        (item) => AIRuleSchema.safeParse(item),
        (item) => (typeof item.title === "string" ? item.title : ""),
      ) ?? [];
  } else {
    delete patch.aiRules;
  }

  if (isRecord(patch.architecture)) {
    const architecture = { ...patch.architecture };
    const components = softenItems(
      architecture.components,
      "component",
      (item) => ArchitectureComponentSchema.safeParse(item),
      (item) => (typeof item.name === "string" ? item.name : ""),
    );
    const externalServices = softenItems(
      architecture.externalServices,
      "service",
      (item) => ExternalServiceSchema.safeParse(item),
      (item) => (typeof item.name === "string" ? item.name : ""),
    );
    if (components) {
      architecture.components = components;
    } else {
      delete architecture.components;
    }
    if (externalServices) {
      architecture.externalServices = externalServices;
    } else {
      delete architecture.externalServices;
    }
    patch.architecture = architecture;
  }

  if (isRecord(patch.database)) {
    const database = { ...patch.database };
    const entities = softenItems(
      database.entities,
      "entity",
      (item) => DatabaseEntitySchema.safeParse(item),
      (item) => (typeof item.name === "string" ? item.name : ""),
    );
    if (entities) {
      database.entities = entities;
    } else {
      delete database.entities;
    }
    patch.database = database;
  }

  return Object.keys(patch).length > 0 ? patch : {};
}

/** Drop extra keys, blank fields, and invalid items so a sloppy LLM patch can still apply. */
export function softenInterviewPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const extraction = pick(value, EXTRACTION_KEYS);
  if ("patch" in extraction) {
    extraction.patch = softenPatch(extraction.patch);
  }

  return extraction;
}
