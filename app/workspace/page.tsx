import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import WorkspaceShell from "@/components/workspace-shell";
import type { Music } from "@/lib/music";

export default async function Workspace() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();
  const user = data?.user ?? null;
  let initialTracks: Music[] = [];
  let initialCredit = 0;

  if (user) {
    const { data: tracks, error } = await client.database
      .from("musics")
      .select()
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("workspace music list failed", error);
    } else {
      initialTracks = (tracks ?? []) as Music[];
    }

    const { data: creditRow, error: creditError } = await client.database
      .from("user_credits")
      .select("credit")
      .eq("user_id", user.id)
      .maybeSingle();

    if (creditError) {
      console.error("workspace credit read failed", creditError);
    } else if (
      creditRow &&
      typeof (creditRow as { credit?: unknown }).credit === "number"
    ) {
      initialCredit = (creditRow as { credit: number }).credit;
    }
  }

  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />
      <WorkspaceShell
        user={
          user
            ? {
                name: user.profile?.name ?? null,
                email: user.email,
                avatarUrl: user.profile?.avatar_url ?? null,
              }
            : null
        }
        initialTracks={initialTracks}
        initialCredit={initialCredit}
      />
    </div>
  );
}
