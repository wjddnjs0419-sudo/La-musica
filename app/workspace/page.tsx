import WorkspaceShell from "@/components/workspace-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Workspace() {
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-[#050505] text-[#f4f1ea]">
      <WorkspaceShell loadInitialData />
    </div>
  );
}
