import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import WorkspaceNavbar from "@/components/workspace-navbar";
import MusicWorkspace from "@/components/music-workspace";

export default async function Workspace() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();
  const user = data?.user ?? null;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />
      <WorkspaceNavbar
        user={
          user
            ? {
                name: user.profile?.name ?? null,
                email: user.email,
                avatarUrl: user.profile?.avatar_url ?? null,
              }
            : null
        }
      />

      <MusicWorkspace />
    </div>
  );
}
