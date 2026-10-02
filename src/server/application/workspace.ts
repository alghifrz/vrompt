import { redirect } from "next/navigation";
import type { WorkspaceProject } from "../../lib/workspace/projects";
import { isAuthFailure } from "./interview-flow";
import { listWorkspaceProjects } from "../runtime";

export async function loadWorkspaceProjects(): Promise<WorkspaceProject[]> {
  try {
    return await listWorkspaceProjects();
  } catch (error) {
    if (isAuthFailure(error)) {
      redirect("/sign-in");
    }
    return [];
  }
}
