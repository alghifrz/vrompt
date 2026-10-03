/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GenerationPageView, GenerationResultView } from "../../lib/generation/view-model";
import { GenerationEditor, type GenerateProject } from "./generation-editor";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const readyPage: GenerationPageView = {
  projectId: "proj-1",
  projectName: "FieldKit",
  status: "ready",
  ready: true,
  jobs: [
    {
      id: "job-bootstrap",
      step: 1,
      title: "Bootstrap the repo",
      summary: "Create the first web application for FieldKit.",
      prompt: "Implement this job for FieldKit.\n\nJob — Bootstrap the repo",
    },
    {
      id: "job-board",
      step: 2,
      title: "Visit board",
      summary: "Show today's visits.",
      prompt: "Implement this job for FieldKit.\n\nJob — Visit board",
    },
  ],
};

const generated: GenerationResultView = {
  projectId: "proj-1",
  projectName: "FieldKit",
  selectedTargets: ["agents-md", "cursor"],
  jobs: readyPage.jobs,
  docs: [
    { path: "PRD.md", content: "# Product Requirements Document\n\nFieldKit" },
    { path: "ERD.md", content: "# Entity Relationship Diagram\n\nerDiagram" },
  ],
  prd: {
    name: "FieldKit",
    type: "web application",
    problem: "Visit notes are scattered.",
    description: "A field toolkit.",
    goals: ["Assign visits without conflicts."],
    successCriteria: ["A dispatcher can assign a visit quickly."],
    users: [
      {
        name: "Dispatcher",
        description: "Coordinates schedules.",
        goals: ["Assign visits"],
        permissions: ["manage-visits"],
      },
    ],
    features: [
      {
        name: "Visit board",
        description: "Show today's visits.",
        priority: "must",
        status: "planned",
        acceptance: ["The board lists today's visits."],
      },
    ],
    stack: ["Next.js"],
    components: [],
    endpoints: [],
  },
  erd: {
    inferred: false,
    notes: [],
    entities: [
      {
        id: "Visit",
        name: "Visit",
        description: "A scheduled visit.",
        fields: [
          { type: "string", name: "id", key: "PK", notes: "Primary key for Visit." },
          { type: "string", name: "title", notes: "Short label shown in lists." },
        ],
      },
      {
        id: "Note",
        name: "Note",
        description: "A visit note.",
        fields: [
          { type: "string", name: "id", key: "PK", notes: "Primary key for Note." },
          { type: "string", name: "visitId", key: "FK", notes: "References Visit.id." },
        ],
      },
    ],
    links: [{ from: "Visit", to: "Note", kind: "one-to-many", label: "has notes" }],
  },
  targets: [
    {
      target: "agents-md",
      files: [{ path: "AGENTS.md", content: "# Project\n\nFieldKit" }],
    },
    {
      target: "cursor",
      files: [
        {
          path: ".cursor/rules/00-project-overview.mdc",
          content: "# FieldKit",
        },
      ],
    },
  ],
  diagnostics: [
    {
      severity: "warning",
      message: "AGENTS.md has no native priority.",
      target: "agents-md",
    },
  ],
  checks: [
    { id: "spec", label: "ProjectSpec valid", passed: true },
    { id: "paths", label: "Output paths valid", passed: true },
    { id: "duplicates", label: "No duplicate files", passed: true },
    { id: "consistency", label: "Cross-target consistency verified", passed: true },
  ],
};

describe("generation UI", () => {
  it("renders target cards", () => {
    render(<GenerationEditor page={readyPage} generateProject={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Generation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visit board" })).toBeInTheDocument();
    expect(screen.getByText("AGENTS.md")).toBeInTheDocument();
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("Qoder")).toBeInTheDocument();
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText("1 target selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("disables generate when nothing is selected", async () => {
    const user = userEvent.setup();
    render(<GenerationEditor page={readyPage} generateProject={vi.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: /Cursor/i }));
    expect(screen.getByText("0 targets selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("selects another target", async () => {
    const user = userEvent.setup();
    render(<GenerationEditor page={readyPage} generateProject={vi.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: /Qoder/i }));
    expect(screen.getByText("2 targets selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("shows a loading state while generating", async () => {
    const user = userEvent.setup();
    const generateProject = vi.fn(
      () => new Promise<Awaited<ReturnType<GenerateProject>>>(() => undefined),
    );

    render(
      <GenerationEditor page={readyPage} generateProject={generateProject} />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByRole("button", { name: "Generating..." })).toBeDisabled();
    expect(screen.getByText("Writing rules, PRD, ERD, and jobs...")).toBeInTheDocument();
  });

  it("renders generated files, preview, checks, warnings, and download", async () => {
    const user = userEvent.setup();
    const generateProject = vi.fn<GenerateProject>(async () => ({
      ok: true,
      view: generated,
    }));

    render(
      <GenerationEditor page={readyPage} generateProject={generateProject} />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByText("Generated files")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PRD.md" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ERD.md" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AGENTS.md" })).toBeInTheDocument();
    expect(screen.getByText(".cursor/rules/00-project-overview.mdc")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview of PRD.md")).toHaveTextContent("FieldKit");
    expect(screen.getByRole("heading", { name: "Use this export" })).toBeInTheDocument();
    expect(screen.getByText("✓ ProjectSpec valid")).toBeInTheDocument();
    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("AGENTS.md has no native priority.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "href",
      "/api/projects/proj-1/export?targets=agents-md,cursor",
    );
  });

  it("restores Download ZIP after the download starts", async () => {
    const user = userEvent.setup();
    render(
      <GenerationEditor
        page={readyPage}
        generateProject={vi.fn<GenerateProject>(async () => ({
          ok: true,
          view: generated,
        }))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(await screen.findByRole("link", { name: "Download ZIP" }));

    expect(screen.getByRole("link", { name: "Downloading..." })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Download ZIP" })).toBeInTheDocument();
  });

  it("shows a visual PRD and ERD preview", async () => {
    const user = userEvent.setup();
    render(
      <GenerationEditor
        page={readyPage}
        generateProject={vi.fn<GenerateProject>(async () => ({
          ok: true,
          view: generated,
        }))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "PRD.md" }));

    const prdPreview = screen.getByLabelText("Preview of PRD.md");
    expect(prdPreview).toHaveTextContent("Product");
    expect(prdPreview).toHaveTextContent("Visit notes are scattered.");
    expect(prdPreview).toHaveTextContent("Dispatcher");
    expect(prdPreview).toHaveTextContent("Visit board");
    expect(prdPreview).toHaveTextContent("Feature catalog");

    await user.click(screen.getByRole("button", { name: "ERD.md" }));
    expect(screen.getByLabelText("Entity relationship diagram")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview of ERD.md")).toHaveTextContent("Visit");
    expect(screen.getByLabelText("Preview of ERD.md")).toHaveTextContent("Attribute");
    expect(screen.getByLabelText("Preview of ERD.md")).toHaveTextContent("References Visit.id.");
    expect(screen.getByLabelText("Preview of ERD.md")).toHaveTextContent("one-to-many");
  });

  it("lets the user open another file preview", async () => {
    const user = userEvent.setup();
    render(
      <GenerationEditor
        page={readyPage}
        generateProject={vi.fn<GenerateProject>(async () => ({
          ok: true,
          view: generated,
        }))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: ".cursor/rules/00-project-overview.mdc" }));

    expect(screen.getByLabelText("Preview of .cursor/rules/00-project-overview.mdc")).toHaveTextContent(
      "# FieldKit",
    );
  });

  it("renders the not-ready state", () => {
    render(
      <GenerationEditor
        page={{ ...readyPage, ready: false, status: "draft" }}
        generateProject={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This project is not ready for generation",
    );
    expect(screen.getByRole("link", { name: "Return to Review" })).toHaveAttribute(
      "href",
      "/review/proj-1",
    );
    expect(screen.queryByRole("button", { name: "Generate" })).not.toBeInTheDocument();
  });
});
