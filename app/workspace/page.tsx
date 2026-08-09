import WorkspaceShell from "@/components/workspace-shell";

export default function Workspace() {
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-[#050505] text-[#f4f1ea]">
      <WorkspaceShell loadInitialData />
    </div>
  );
}
