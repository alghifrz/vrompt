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
};

const generated: GenerationResultView = {
  projectId: "proj-1",
  projectName: "FieldKit",
  selectedTargets: ["agents-md", "cursor"],
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
    expect(screen.getByText("AGENTS.md")).toBeInTheDocument();
    expect(screen.getByText("Cursor")).toBeInTheDocument();
    expect(screen.getByText("Qoder")).toBeInTheDocument();
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText("0 targets selected")).toBeInTheDocument();
  });

  it("disables generate when nothing is selected", () => {
    render(<GenerationEditor page={readyPage} generateProject={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("selects targets and enables generate", async () => {
    const user = userEvent.setup();
    render(<GenerationEditor page={readyPage} generateProject={vi.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: /Cursor/i }));
    expect(screen.getByText("1 target selected")).toBeInTheDocument();
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

    await user.click(screen.getByRole("checkbox", { name: /Cursor/i }));
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByRole("button", { name: "Generating..." })).toBeDisabled();
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

    await user.click(screen.getByRole("checkbox", { name: /AGENTS.md/i }));
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(await screen.findByText("Generated files")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AGENTS.md" })).toBeInTheDocument();
    expect(screen.getByText(".cursor/rules/00-project-overview.mdc")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview of AGENTS.md")).toHaveTextContent("FieldKit");
    expect(screen.getByText("✓ ProjectSpec valid")).toBeInTheDocument();
    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(screen.getByText("AGENTS.md has no native priority.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download ZIP" })).toHaveAttribute(
      "href",
      "/api/projects/proj-1/export?targets=agents-md,cursor",
    );
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

    await user.click(screen.getByRole("checkbox", { name: /Cursor/i }));
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
