import { NextResponse, type NextRequest } from "next/server";
import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import { MUSICS_BUCKET, type Music } from "@/lib/music";
import { reconcileMusicRow } from "@/lib/reconcile-music";
import { getMusicGenerationProvider } from "@/lib/music-generation/provider";

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_LIMIT = 50;
const INSFORGE_URL =
  process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL ?? "";

// Internal cron endpoint: reconciles processing music rows that the client
// may not have polled to completion (tab closed, network drop, etc.).
// Secured by CRON_SECRET: Vercel Cron sends Authorization: Bearer <CRON_SECRET>;
// manual callers may use x-cron-secret header instead.
// Idempotent: safe to call multiple times for the same rows.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const legacySecret = request.headers.get("x-cron-secret");
  const secret = bearerSecret ?? legacySecret;
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    if (!CRON_SECRET) console.warn("reconcile: CRON_SECRET is not configured");
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createInsforgeAdminClient();

  const { data: rows, error } = await admin.database
    .from("musics")
    .select()
    .eq("status", "processing")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("reconcile: db query failed", error);
    return NextResponse.json({ error: "db_query_failed" }, { status: 500 });
  }

  const musics = (rows ?? []) as Music[];
  const results = await Promise.allSettled(
    musics.map((music) =>
      reconcileMusicRow(music, {
        getProvider: getMusicGenerationProvider,
        downloadAudio: async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`download failed: ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        },
        uploadAudio: async (key, bytes) => {
          const file = new File([Buffer.from(bytes)], key.split("/").pop()!, { type: "audio/mpeg" });
          const { data: uploaded, error: uploadError } = await admin.storage
            .from(MUSICS_BUCKET)
            .upload(key, file);
          if (uploadError || !uploaded) throw uploadError ?? new Error("upload failed");
          return { url: uploaded.url, key: uploaded.key };
        },
        markCompleted: async (musicId, audioUrl, audioKey) => {
          const { error: updateError } = await admin.database
            .from("musics")
            .update({
              status: "completed",
              audio_url: audioUrl,
              audio_key: audioKey,
            })
            .eq("id", musicId)
            .eq("status", "processing") // guard against double-write
            .select()
            .maybeSingle();
          if (updateError) console.error("reconcile: markCompleted failed", updateError);
        },
        getAudioUrl: (key) =>
          `${INSFORGE_URL}/storage/v1/object/public/${MUSICS_BUCKET}/${key}`,
        refundAndMarkFailed: async (musicId, userId, reason) => {
          const { error: rpcError } = await admin.database.rpc("refund_failed_music_credit", {
            p_user_id: userId,
            p_music_id: musicId,
            p_message: reason,
          });
          if (rpcError) console.error("reconcile: refund failed", rpcError);
        },
      }),
    ),
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ outcome: string }>[];
  const summary = {
    total: musics.length,
    completed: fulfilled.filter((r) => r.value.outcome === "completed").length,
    failed: fulfilled.filter((r) => r.value.outcome === "failed").length,
    timed_out: fulfilled.filter((r) => r.value.outcome === "timed_out").length,
    pending: fulfilled.filter((r) => r.value.outcome === "pending").length,
    no_prediction_id: fulfilled.filter((r) => r.value.outcome === "no_prediction_id").length,
    errors: results.filter((r) => r.status === "rejected").length,
  };

  return NextResponse.json(summary);
}
