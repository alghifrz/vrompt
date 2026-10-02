/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceLoading } from "./workspace-loading";

describe("workspace loading", () => {
  it("shows a branded status and the current step", () => {
    render(
      <WorkspaceLoading
        title="Step 1 of 3 · Interview"
        message="Loading the interview..."
        step={0}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading the interview...");
    expect(screen.getByText("Step 1 of 3 · Interview")).toBeInTheDocument();
    expect(screen.getByText("Interview")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });
});
