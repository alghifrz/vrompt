import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

function uniqueById<Schema extends z.ZodType<{ id: string }>>(
  itemSchema: Schema,
  label: string,
) {
  return z.array(itemSchema).superRefine((items, ctx) => {
    const seen = new Set<string>();

    for (const [index, item] of items.entries()) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate ${label} id "${item.id}"`,
          path: [index, "id"],
        });
        continue;
      }

      seen.add(item.id);
    }
  });
}

export const ProjectStatusSchema = z.enum(["draft", "ready", "archived"]);
export const PrioritySchema = z.enum(["must", "should", "later"]);
export const FeatureStatusSchema = z.enum([
  "planned",
  "approved",
  "implemented",
]);
export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
export const ActivationModeSchema = z.enum([
  "always",
  "scoped",
  "agent_decides",
  "manual",
]);

export const ProjectSchema = z.object({
  name: nonEmptyString,
  description: nonEmptyString,
  problem: nonEmptyString,
  /** High-level audience labels. Detailed personas live in `users`. */
  targetUsers: z.array(nonEmptyString).min(1),
  type: nonEmptyString,
  status: ProjectStatusSchema,
});

export const GoalSchema = z.object({
  id: nonEmptyString,
  statement: nonEmptyString,
});

export const GoalsSchema = z.object({
  primary: uniqueById(GoalSchema, "goal"),
  successCriteria: z.array(nonEmptyString),
});

export const FeatureSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
  priority: PrioritySchema,
  status: FeatureStatusSchema,
  acceptanceCriteria: z.array(nonEmptyString),
});

export const UserTypeSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
  goals: z.array(nonEmptyString),
  permissions: z.array(nonEmptyString),
});

export const StackSchema = z.object({
  frontend: nonEmptyString.optional(),
  backend: nonEmptyString.optional(),
  database: nonEmptyString.optional(),
  authentication: nonEmptyString.optional(),
  hosting: nonEmptyString.optional(),
  additional: z.array(nonEmptyString).optional(),
});

export const ArchitectureComponentSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
});

export const ExternalServiceSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  purpose: nonEmptyString,
});

export const ArchitectureSchema = z.object({
  style: nonEmptyString.optional(),
  components: uniqueById(ArchitectureComponentSchema, "component").optional(),
  externalServices: uniqueById(
    ExternalServiceSchema,
    "external service",
  ).optional(),
  constraints: z.array(nonEmptyString).optional(),
});

export const DatabaseEntitySchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  description: nonEmptyString,
});

export const DatabaseRelationshipSchema = z.object({
  from: nonEmptyString,
  to: nonEmptyString,
  type: nonEmptyString,
  description: nonEmptyString.optional(),
});

export const DatabaseSchema = z.object({
  entities: uniqueById(DatabaseEntitySchema, "entity").optional(),
  relationships: z.array(DatabaseRelationshipSchema).optional(),
  constraints: z.array(nonEmptyString).optional(),
});

export const ApiEndpointSchema = z.object({
  method: HttpMethodSchema,
  path: nonEmptyString.refine((path) => path.startsWith("/"), {
    message: "Path must start with /",
  }),
  purpose: nonEmptyString,
  authRequired: z.boolean(),
});

export const ApiSchema = z.object({
  endpoints: z.array(ApiEndpointSchema),
});

export const SecuritySchema = z.object({
  authentication: z.array(nonEmptyString).optional(),
  authorization: z.array(nonEmptyString).optional(),
  sensitiveData: z.array(nonEmptyString).optional(),
  constraints: z.array(nonEmptyString).optional(),
});

export const ConstraintSchema = z.object({
  budget: nonEmptyString.optional(),
  deployment: z.array(nonEmptyString).optional(),
  technology: z.array(nonEmptyString).optional(),
  compliance: z.array(nonEmptyString).optional(),
  scope: z.array(nonEmptyString).optional(),
});

const aiRuleBaseSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  priority: PrioritySchema,
  description: nonEmptyString.optional(),
  body: nonEmptyString,
  rationale: nonEmptyString,
});

/** Neutral activation hint. Tool adapters map this to editor-specific metadata. */
export const AIRuleSchema = z.discriminatedUnion("activationMode", [
  aiRuleBaseSchema.extend({
    activationMode: z.literal("always"),
  }),
  aiRuleBaseSchema.extend({
    activationMode: z.literal("scoped"),
    globs: z.array(nonEmptyString).min(1),
  }),
  aiRuleBaseSchema.extend({
    activationMode: z.literal("agent_decides"),
    globs: z.array(nonEmptyString).optional(),
  }),
  aiRuleBaseSchema.extend({
    activationMode: z.literal("manual"),
    globs: z.array(nonEmptyString).optional(),
  }),
]);

export const ProjectSpecSchema = z.object({
  project: ProjectSchema,
  goals: GoalsSchema.optional(),
  features: uniqueById(FeatureSchema, "feature").optional(),
  users: uniqueById(UserTypeSchema, "user type").optional(),
  stack: StackSchema.optional(),
  architecture: ArchitectureSchema.optional(),
  database: DatabaseSchema.optional(),
  api: ApiSchema.optional(),
  security: SecuritySchema.optional(),
  constraints: ConstraintSchema.optional(),
  aiRules: uniqueById(AIRuleSchema, "AI rule").optional(),
});

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ActivationMode = z.infer<typeof ActivationModeSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Goals = z.infer<typeof GoalsSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type UserType = z.infer<typeof UserTypeSchema>;
export type Stack = z.infer<typeof StackSchema>;
export type ArchitectureComponent = z.infer<typeof ArchitectureComponentSchema>;
export type ExternalService = z.infer<typeof ExternalServiceSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type DatabaseEntity = z.infer<typeof DatabaseEntitySchema>;
export type DatabaseRelationship = z.infer<typeof DatabaseRelationshipSchema>;
export type DatabaseSpec = z.infer<typeof DatabaseSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type Api = z.infer<typeof ApiSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type AIRule = z.infer<typeof AIRuleSchema>;
export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
