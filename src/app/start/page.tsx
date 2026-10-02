import type { Metadata } from "next";
import { StartScreen } from "../../components/start/start-screen";
import { loadWorkspaceProjects } from "../../server/application/workspace";

export const metadata: Metadata = {
  title: "Start",
};

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const projects = await loadWorkspaceProjects();

  return <StartScreen error={error === "start"} projects={projects} />;
}
