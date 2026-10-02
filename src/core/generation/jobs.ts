import type { Feature, ProjectSpec } from "../schema/project-spec";
import type { GeneratedFile } from "./types";

export interface GenerationJob {
  readonly id: string;
  readonly step: number;
  readonly title: string;
  readonly summary: string;
  readonly prompt: string;
}

const PRIORITY_RANK = { must: 0, should: 1, later: 2 } as const;

export function buildGenerationJobs(spec: ProjectSpec): GenerationJob[] {
  const drafts: Array<Omit<GenerationJob, "step">> = [
    bootstrapJob(spec),
    ...(needsFoundation(spec) ? [foundationJob(spec)] : []),
    ...sortedFeatures(spec).map((feature) => featureJob(spec, feature)),
    ...(spec.features?.length || !spec.goals?.primary.length
      ? []
      : [outcomeJob(spec)]),
    ...(spec.users?.length ? [usersJob(spec)] : []),
    ...(spec.api?.endpoints.length ? [apiJob(spec)] : []),
    ...(spec.aiRules?.length ? [rulesJob(spec)] : []),
    wrapUpJob(spec),
  ];

  return drafts.map((job, index) => ({ ...job, step: index + 1 }));
}

export function renderJobFiles(
  jobs: readonly GenerationJob[],
  projectName: string,
): GeneratedFile[] {
  return [
    {
      path: "README.md",
      content: renderJobsReadme(jobs, projectName),
    },
    ...jobs.map((job) => ({
      path: jobFilename(job),
      content: renderJobMarkdown(job),
    })),
  ];
}

export function buildJobPack(spec: ProjectSpec): {
  jobs: GenerationJob[];
  files: GeneratedFile[];
} {
  const jobs = buildGenerationJobs(spec);
  return {
    jobs,
    files: renderJobFiles(jobs, spec.project.name),
  };
}

function bootstrapJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const stack = stackLine(spec);
  return {
    id: "job-bootstrap",
    title: "Bootstrap the repo",
    summary: `Create the first ${spec.project.type} for ${spec.project.name}.`,
    prompt: promptBlock(spec, "Bootstrap the repo", [
      `Scaffold ${spec.project.name} as a ${spec.project.type}.`,
      spec.project.description,
      spec.project.problem ? `Problem to solve: ${spec.project.problem}` : "",
      stack ? `Preferred stack: ${stack}.` : "",
      "Create the smallest runnable project. Do not implement product features yet.",
    ]),
  };
}

function foundationJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const parts = [
    spec.architecture?.style
      ? `Architecture: ${spec.architecture.style}.`
      : "",
    spec.stack?.authentication
      ? `Authentication: ${spec.stack.authentication}.`
      : spec.security?.authentication?.[0]
        ? `Authentication: ${spec.security.authentication[0]}.`
        : "",
    spec.stack?.database || spec.database
      ? `Data: ${spec.stack?.database ?? "a small starting schema"}.`
      : "",
    spec.database?.entities?.length
      ? `Entities to start with: ${spec.database.entities.map((entity) => entity.name).join(", ")}.`
      : "",
    spec.security?.constraints?.[0] ?? "",
  ];

  return {
    id: "job-foundation",
    title: "Lay the foundation",
    summary: "Set up auth, data, and the first app shape before features.",
    prompt: promptBlock(spec, "Lay the foundation", [
      "Add only the foundation the first version needs.",
      ...parts,
      "Do not build product screens yet unless they are required to prove the foundation works.",
    ]),
  };
}

function featureJob(
  spec: ProjectSpec,
  feature: Feature,
): Omit<GenerationJob, "step"> {
  return {
    id: `job-feature-${feature.id}`,
    title: feature.name,
    summary: feature.description,
    prompt: promptBlock(spec, feature.name, [
      feature.description,
      `Priority: ${feature.priority}.`,
      feature.acceptanceCriteria.length
        ? `Acceptance:\n${feature.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`
        : "",
      "Implement only this feature. Reuse the existing foundation. Do not start the next feature.",
    ]),
  };
}

function outcomeJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const goal = spec.goals!.primary[0]!;
  return {
    id: "job-outcome",
    title: "Deliver the first outcome",
    summary: goal.statement,
    prompt: promptBlock(spec, "Deliver the first outcome", [
      `Primary outcome: ${goal.statement}`,
      spec.goals!.successCriteria.length
        ? `Success looks like:\n${spec.goals!.successCriteria.map((item) => `- ${item}`).join("\n")}`
        : "",
      "Build the smallest path that makes this outcome real.",
    ]),
  };
}

function usersJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const users = spec.users!.map((user) => {
    const permissions = user.permissions.length
      ? ` Can: ${user.permissions.join(", ")}.`
      : "";
    return `- ${user.name}: ${user.description}${permissions}`;
  });

  return {
    id: "job-users",
    title: "Fit the product to its users",
    summary: "Make screens and permissions match the people who will use it.",
    prompt: promptBlock(spec, "Fit the product to its users", [
      "Adjust navigation, empty states, and permissions for these users:",
      users.join("\n"),
      "Do not add a new user type.",
    ]),
  };
}

function apiJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const endpoints = spec.api!.endpoints.map(
    (endpoint) =>
      `- ${endpoint.method} ${endpoint.path} — ${endpoint.purpose}${
        endpoint.authRequired ? " (auth required)" : ""
      }`,
  );

  return {
    id: "job-api",
    title: "Add the first API",
    summary: "Expose the endpoints the first version actually needs.",
    prompt: promptBlock(spec, "Add the first API", [
      "Implement only these endpoints:",
      endpoints.join("\n"),
      "Keep handlers thin. Do not invent extra routes.",
    ]),
  };
}

function rulesJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const rules = spec.aiRules!.map((rule) => `- ${rule.title}: ${rule.body}`);
  return {
    id: "job-rules",
    title: "Apply the project rules",
    summary: "Clean the code so it follows the spec rules.",
    prompt: promptBlock(spec, "Apply the project rules", [
      "Refactor only enough to follow these rules:",
      rules.join("\n"),
      "Do not add features while cleaning this up.",
    ]),
  };
}

function wrapUpJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const criteria = spec.goals?.successCriteria ?? [];
  return {
    id: "job-wrap-up",
    title: "Wrap up the first version",
    summary: "Check the first version against the spec and stop.",
    prompt: promptBlock(spec, "Wrap up the first version", [
      `Confirm ${spec.project.name} covers the spec without extra scope.`,
      criteria.length
        ? `Success criteria:\n${criteria.map((item) => `- ${item}`).join("\n")}`
        : "",
      "Fix only blockers. Do not start a v2.",
    ]),
  };
}

function needsFoundation(spec: ProjectSpec): boolean {
  return Boolean(spec.stack || spec.architecture || spec.database || spec.security);
}

function sortedFeatures(spec: ProjectSpec): Feature[] {
  return [...(spec.features ?? [])].sort((left, right) => {
    const rank = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
    return rank !== 0 ? rank : left.id.localeCompare(right.id);
  });
}

function stackLine(spec: ProjectSpec): string {
  if (!spec.stack) {
    return "";
  }

  return [
    spec.stack.frontend,
    spec.stack.backend,
    spec.stack.database,
    spec.stack.authentication,
    spec.stack.hosting,
    ...(spec.stack.additional ?? []),
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, all) => all.indexOf(item) === index)
    .join(", ");
}

function promptBlock(
  spec: ProjectSpec,
  title: string,
  lines: readonly string[],
): string {
  return [
    `Implement this job for ${spec.project.name}.`,
    "",
    "Read the exported project rules first (AGENTS.md and any .cursor/rules, .qoder/rules, or CLAUDE.md from the ZIP). Do not invent features.",
    "",
    `Job — ${title}`,
    ...lines.filter((line) => line.trim().length > 0),
    "",
    "Build only this job. Keep the first version small. Stop when it works.",
  ].join("\n");
}

function jobFilename(job: GenerationJob): string {
  const slug = job.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${String(job.step).padStart(2, "0")}-${slug || "job"}.md`;
}

function renderJobsReadme(
  jobs: readonly GenerationJob[],
  projectName: string,
): string {
  const list = jobs
    .map((job) => `${job.step}. ${job.title} — ${job.summary}`)
    .join("\n");

  return [
    `# AI jobs for ${projectName}`,
    "",
    "Unzip this export into your project, open it in Cursor (or the tool you generated), then paste one job prompt at a time.",
    "",
    "Finish a job before starting the next one.",
    "",
    "## Order",
    "",
    list,
    "",
  ].join("\n");
}

function renderJobMarkdown(job: GenerationJob): string {
  return [`# Job ${String(job.step).padStart(2, "0")} — ${job.title}`, "", job.prompt, ""].join(
    "\n",
  );
}
