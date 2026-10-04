import { z } from "zod";
import {
  AIRuleSchema,
  ApiSchema,
  ArchitectureSchema,
  ConstraintSchema,
  DatabaseSchema,
  FeatureSchema,
  GoalsSchema,
  ProjectStatusSchema,
  SecuritySchema,
  StackSchema,
  UserTypeSchema,
} from "../schema/project-spec";

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

const projectPatchSchema = z
  .object({
    name: nonEmptyString.optional(),
    description: nonEmptyString.optional(),
    problem: nonEmptyString.optional(),
    targetUsers: z.array(nonEmptyString).optional(),
    type: nonEmptyString.optional(),
    status: ProjectStatusSchema.optional(),
  })
  .strict();

export const ProjectSpecPatchSchema = z
  .object({
    project: projectPatchSchema.optional(),
    goals: GoalsSchema.optional(),
    features: uniqueById(FeatureSchema, "feature").optional(),
    users: uniqueById(UserTypeSchema, "user type").optional(),
    stack: StackSchema.strict().optional(),
    architecture: ArchitectureSchema.optional(),
    database: DatabaseSchema.optional(),
    api: ApiSchema.optional(),
    security: SecuritySchema.optional(),
    constraints: ConstraintSchema.optional(),
    aiRules: uniqueById(AIRuleSchema, "AI rule").optional(),
  })
  .strict();

export const InterviewExtractionSchema = z
  .object({
    patch: ProjectSpecPatchSchema.optional(),
    skip: z.boolean().optional(),
    confirm: z.boolean().optional(),
    clarify: z.boolean().optional(),
  })
  .strict();

export type ParsedProjectSpecPatch = z.infer<typeof ProjectSpecPatchSchema>;

export function parseProjectSpecPatch(value: unknown) {
  return ProjectSpecPatchSchema.safeParse(value);
}

export function parseInterviewExtraction(value: unknown) {
  return InterviewExtractionSchema.safeParse(value);
}
