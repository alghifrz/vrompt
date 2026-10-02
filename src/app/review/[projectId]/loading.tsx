import { WorkspaceLoading } from "../../../components/app/workspace-loading";

export default function ReviewLoading() {
  return (
    <WorkspaceLoading
      title="Step 2 of 3"
      message="Loading the specification..."
      step={1}
    />
  );
}
