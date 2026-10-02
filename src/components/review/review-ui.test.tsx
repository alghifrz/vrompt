/** @vitest-environment jsdom */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectSpec } from "../../core/schema/project-spec";
import { toReviewViewModel } from "../../lib/review/view-model";
import { ReviewEditor, type SaveReview } from "./review-editor";
import { ReviewSections } from "./review-sections";

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

const minimalSpec: ProjectSpec = {
  project: {
    name: "FieldKit",
    description: "A field toolkit.",
    problem: "Visit notes are scattered.",
    targetUsers: ["Dispatchers"],
    type: "web application",
    status: "draft",
  },
};

const fullSpec: ProjectSpec = {
  ...minimalSpec,
  project: { ...minimalSpec.project, status: "ready" },
  goals: {
    primary: [{ id: "goal-1", statement: "Assign visits quickly." }],
    successCriteria: ["A visit can be assigned in two minutes."],
  },
  features: [
    {
      id: "feature-1",
      name: "Visit board",
      description: "Show today's visits.",
      priority: "must",
      status: "planned",
      acceptanceCriteria: ["The board lists today's visits."],
    },
  ],
  users: [
    {
      id: "user-1",
      name: "Dispatcher",
      description: "Coordinates visits.",
      goals: ["Avoid conflicts"],
      permissions: ["manage-visits"],
    },
  ],
  stack: { frontend: "React", backend: "Node.js" },
  architecture: { style: "modular monolith" },
  database: {
    entities: [
      { id: "entity-1", name: "Visit", description: "A scheduled visit." },
    ],
  },
  api: {
    endpoints: [
      {
        method: "GET",
        path: "/visits",
        purpose: "List visits.",
        authRequired: true,
      },
    ],
  },
  security: { authentication: ["Email and password"] },
  constraints: { budget: "One engineer." },
  aiRules: [
    {
      id: "rule-1",
      title: "Keep domain logic framework-free",
      priority: "must",
      activationMode: "always",
      body: "Do not import UI frameworks from domain modules.",
      rationale: "The specification stays portable.",
    },
  ],
};

function viewFor(spec: ProjectSpec) {
  return toReviewViewModel({ projectId: "proj-1", spec });
}

describe("review UI", () => {
  it("renders project fields and a semantic heading", () => {
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Project Specification" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("FieldKit");
    expect(screen.getByLabelText("Description")).toHaveValue("A field toolkit.");
    expect(screen.getByLabelText("Problem")).toHaveValue(
      "Visit notes are scattered.",
    );
  });

  it("renders optional empty sections without inventing data", () => {
    render(
      <ReviewSections
        spec={minimalSpec}
        disabled={false}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("No goals have been captured yet.")).toBeInTheDocument();
    expect(screen.getByText("No database specification yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add database details" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Frontend")).not.toBeInTheDocument();
  });

  it("renders and edits populated sections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReviewSections spec={fullSpec} disabled={false} onChange={onChange} />,
    );

    expect(screen.getByLabelText("Primary goal 1")).toHaveValue(
      "Assign visits quickly.",
    );
    expect(screen.getAllByLabelText("Name")[0]).toHaveValue("FieldKit");
    expect(screen.getByDisplayValue("Visit board")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dispatcher")).toBeInTheDocument();
    expect(screen.getByLabelText("Frontend")).toHaveValue("React");
    expect(screen.getByLabelText("Style")).toHaveValue("modular monolith");
    expect(screen.getByLabelText("Entity 1 name")).toHaveValue("Visit");
    expect(screen.getByLabelText("Path")).toHaveValue("/visits");
    expect(screen.getByDisplayValue("Email and password")).toBeInTheDocument();
    expect(screen.getByLabelText("Budget")).toHaveValue("One engineer.");
    expect(screen.getByLabelText("Rule 1 title")).toHaveValue(
      "Keep domain logic framework-free",
    );

    await user.type(screen.getByLabelText("Frontend"), " Native");
    expect(onChange).toHaveBeenCalled();
  });

  it("adds and deletes collection items", async () => {
    const user = userEvent.setup();
    render(
      <ReviewEditor initialView={viewFor(fullSpec)} saveReview={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Add feature" }));
    expect(screen.getByText("Feature 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete feature 2" }));
    expect(screen.queryByText("Feature 2")).not.toBeInTheDocument();
  });

  it("can add an optional section from its empty state", async () => {
    const user = userEvent.setup();
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Add stack details" }));
    expect(screen.getByLabelText("Frontend")).toBeInTheDocument();
  });

  it("shows unsaved changes after an edit", async () => {
    const user = userEvent.setup();
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    expect(screen.getByText("All changes saved")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "FieldKit Pro");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("disables save while a request is in flight", async () => {
    const user = userEvent.setup();
    let resolveSave: (value: { ok: true; view: ReturnType<typeof viewFor> }) => void =
      () => undefined;
    const saveReview = vi.fn(
      () =>
        new Promise<{ ok: true; view: ReturnType<typeof viewFor> }>((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={saveReview} />,
    );

    await user.type(screen.getByLabelText("Name"), " Pro");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();

    resolveSave({
      ok: true,
      view: viewFor({
        ...minimalSpec,
        project: { ...minimalSpec.project, name: "FieldKit Pro" },
      }),
    });
  });

  it("replaces local state after a successful save", async () => {
    const user = userEvent.setup();
    const saved = viewFor({
      ...minimalSpec,
      project: { ...minimalSpec.project, name: "FieldKit Pro" },
    });
    const saveReview = vi.fn<SaveReview>(async () => ({
      ok: true,
      view: saved,
    }));

    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={saveReview} />,
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "FieldKit Pro");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("All changes saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("FieldKit Pro");
  });

  it("keeps edits and shows validation errors when save fails", async () => {
    const user = userEvent.setup();
    const saveReview = vi.fn<SaveReview>(async () => ({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "This specification still needs attention before it can be saved.",
        retryable: true,
        fields: [{ path: "project.name", message: "Project name is required." }],
      },
    }));

    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={saveReview} />,
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("This specification still needs attention before it can be saved."),
    ).toBeInTheDocument();
    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows the ready state for a valid ready specification", () => {
    render(
      <ReviewEditor initialView={viewFor(fullSpec)} saveReview={vi.fn()} />,
    );

    expect(screen.getByText("Ready for generation")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue to generation" }),
    ).toHaveAttribute("href", "/generate/proj-1");
  });

  it("shows needs attention when the local spec is invalid", async () => {
    const user = userEvent.setup();
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText("Name"));
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
  });

  it("labels the main save control", () => {
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Back to interview" })).toHaveAttribute(
      "href",
      "/interview/proj-1",
    );
  });

  it("keeps section headings accessible when opening an empty section", async () => {
    const user = userEvent.setup();
    render(
      <ReviewEditor initialView={viewFor(minimalSpec)} saveReview={vi.fn()} />,
    );

    const database = screen.getByText("Database").closest("details");
    expect(database).toBeTruthy();
    if (!database) {
      return;
    }

    await user.click(within(database).getByText("Toggle"));
    expect(
      within(database).getByRole("button", { name: "Add database details" }),
    ).toBeInTheDocument();
  });
});
