import { WorkspaceLoading } from "../../../components/app/workspace-loading";

export default function InterviewLoading() {
  return (
    <WorkspaceLoading
      title="Step 1 of 3"
      message="Loading the interview..."
      step={0}
    />
  );
}
