"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isWorkspaceAuthFailure,
  type DeleteProjectResult,
  type RenameProjectResult,
} from "../../server/application/workspace-flow";
import { getWorkspaceFlow } from "../../server/runtime";

function refreshProjectPaths(projectId: string) {
  revalidatePath("/start");
  revalidatePath(`/interview/${projectId}`);
  revalidatePath(`/review/${projectId}`);
  revalidatePath(`/generate/${projectId}`);
}

export async function renameProjectAction(input: {
  projectId: string;
  name: string;
}): Promise<RenameProjectResult> {
  try {
    const result = await getWorkspaceFlow().renameProject(
      input.projectId,
      input.name,
    );
    if (result.ok) {
      refreshProjectPaths(input.projectId);
    }
    return result;
  } catch (error) {
    if (isWorkspaceAuthFailure(error)) {
      redirect("/sign-in");
    }
    throw error;
  }
}

export async function deleteProjectAction(input: {
  projectId: string;
}): Promise<DeleteProjectResult> {
  try {
    const result = await getWorkspaceFlow().deleteProject(input.projectId);
    if (result.ok) {
      refreshProjectPaths(input.projectId);
    }
    return result;
  } catch (error) {
    if (isWorkspaceAuthFailure(error)) {
      redirect("/sign-in");
    }
    throw error;
  }
}
