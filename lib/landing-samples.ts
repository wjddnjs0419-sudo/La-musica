import { createInsforgeAdminClient } from "@/lib/insforge-admin";

export const LANDING_SAMPLE_MUSIC_IDS = [
  "56b487e1-bfc9-4a95-aae2-dc3c4f02f73e",
  "0b2bcccd-ab58-44ba-8166-40b47f1e4e79",
  "cfbdd033-ac2c-4649-96aa-49fbe7a646d0",
  "58285232-41b1-4261-8644-3853bda59de6",
] as const;

export type LandingSampleTrack = {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioSrc: string;
  thumbnailSrc: string | null;
};

type MusicSampleRow = {
  id: string;
  title: string;
  prompt: string;
  audio_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
};

export async function getLandingSampleTracks(): Promise<LandingSampleTrack[]> {
  try {
    const admin = createInsforgeAdminClient();
    const { data, error } = await admin.database
      .from("musics")
      .select("id, title, prompt, audio_url, thumbnail_url, duration_seconds")
      .in("id", [...LANDING_SAMPLE_MUSIC_IDS]);

    if (error) {
      console.error("landing samples read failed", error);
      return [];
    }

    const rows = (data ?? []) as MusicSampleRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));

    return LANDING_SAMPLE_MUSIC_IDS.map((id) => byId.get(id))
      .filter((row): row is MusicSampleRow => Boolean(row?.audio_url))
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: describePrompt(row.prompt),
        duration: formatDuration(row.duration_seconds),
        audioSrc: row.audio_url ?? "",
        thumbnailSrc: row.thumbnail_url,
      }));
  } catch (error) {
    console.error("landing samples unavailable", error);
    return [];
  }
}

function describePrompt(prompt: string) {
  const firstPhrase = prompt
    .split(/[,.]/)[0]
    .trim()
    .replace(/\s+/g, " ");

  if (!firstPhrase) return "AI-generated track";
  return firstPhrase.length > 46 ? `${firstPhrase.slice(0, 43)}...` : firstPhrase;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Full track";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
