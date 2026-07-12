import WorkspaceShell from "@/components/workspace-shell";

export default function Workspace() {
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />
      <WorkspaceShell loadInitialData />
    </div>
  );
}
