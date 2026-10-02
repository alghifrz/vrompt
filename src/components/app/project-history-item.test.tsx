/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectHistoryItem } from "./project-history-item";

const renameProjectAction = vi.fn();
const deleteProjectAction = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

vi.mock("../../app/actions/workspace", () => ({
  renameProjectAction: (...args: unknown[]) => renameProjectAction(...args),
  deleteProjectAction: (...args: unknown[]) => deleteProjectAction(...args),
}));

const project = {
  id: "proj-1",
  name: "FieldKit",
  status: "draft" as const,
  stage: "interview" as const,
  href: "/interview/proj-1",
};

describe("project history item", () => {
  beforeEach(() => {
    renameProjectAction.mockReset();
    deleteProjectAction.mockReset();
    refresh.mockReset();
    push.mockReset();
  });

  it("opens rename and save from the actions menu", async () => {
    const user = userEvent.setup();
    renameProjectAction.mockResolvedValue({
      ok: true,
      project: { ...project, name: "Field Kit" },
    });

    render(<ProjectHistoryItem project={project} active />);

    await user.click(screen.getByRole("button", { name: "Actions for FieldKit" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Field Kit");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(renameProjectAction).toHaveBeenCalledWith({
        projectId: "proj-1",
        name: "Field Kit",
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("deletes the current project and returns to start", async () => {
    const user = userEvent.setup();
    deleteProjectAction.mockResolvedValue({ ok: true });

    render(<ProjectHistoryItem project={project} active />);

    await user.click(screen.getByRole("button", { name: "Actions for FieldKit" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete this project?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deleteProjectAction).toHaveBeenCalledWith({ projectId: "proj-1" });
    });
    expect(push).toHaveBeenCalledWith("/start");
    expect(refresh).toHaveBeenCalled();
  });

  it("opens a ready project on generate", () => {
    render(
      <ProjectHistoryItem
        project={{
          ...project,
          status: "ready",
          stage: "generate",
          href: "/generate/proj-1",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /FieldKit/ })).toHaveAttribute(
      "href",
      "/generate/proj-1",
    );
    expect(screen.getByText("Ready · Generate")).toBeInTheDocument();
  });
});
