import { WorkspaceLoading } from "../../../components/app/workspace-loading";

export default function GenerateLoading() {
  return (
    <WorkspaceLoading
      title="Step 3 of 3"
      message="Loading generation..."
      step={2}
    />
  );
}
