import { after } from "next/server";
import type { createServerClient } from "@insforge/sdk/ssr";
import { MUSICS_BUCKET, type Music } from "../music";
import { generateThumbnail } from "./generateThumbnail";

type ServerClient = ReturnType<typeof createServerClient>;

// Schedules cover-art generation via `after()` so the serverless function
// stays alive until upload + DB persist finish, instead of racing the
// response and sometimes leaving thumbnail_status stuck at "pending"
// forever (the function can be frozen the instant the response is sent).
export function scheduleThumbnailGeneration(
  client: ServerClient,
  userId: string,
  music: Music,
  prompt: string,
): void {
  after(() =>
    generateAndPersistThumbnail(client, userId, music, prompt).catch((err) =>
      console.error("bg thumbnail failed", { musicId: music.id, err }),
    ),
  );
}

async function generateAndPersistThumbnail(
  client: ServerClient,
  userId: string,
  music: Music,
  prompt: string,
): Promise<Music> {
  try {
    const blob = await generateThumbnail(prompt);
    const file = new File([blob], `${music.id}.webp`, { type: "image/webp" });
    const uploadKey = `${userId}/${music.id}-thumbnail-${Date.now()}.webp`;
    const { data: uploaded, error: uploadError } = await client.storage
      .from(MUSICS_BUCKET)
      .upload(uploadKey, file);

    if (uploadError || !uploaded) {
      throw uploadError ?? new Error("thumbnail_upload_failed");
    }

    const { data: updated, error: updateError } = await client.database
      .from("musics")
      .update({
        thumbnail_url: uploaded.url,
        thumbnail_key: uploaded.key,
        thumbnail_prompt: prompt,
        thumbnail_status: "succeeded",
      })
      .eq("id", music.id)
      .select();

    if (updateError || !updated?.[0]) {
      throw updateError ?? new Error("thumbnail_update_failed");
    }

    return updated[0] as Music;
  } catch (err) {
    console.error("thumbnail generation failed", { musicId: music.id, err });
    const { data: updated, error } = await client.database
      .from("musics")
      .update({
        thumbnail_url: null,
        thumbnail_key: null,
        thumbnail_prompt: prompt,
        thumbnail_status: "failed",
      })
      .eq("id", music.id)
      .select();

    if (error) {
      console.error("thumbnail failure status update failed", {
        musicId: music.id,
        error,
      });
      return { ...music, thumbnail_prompt: prompt, thumbnail_status: "failed" };
    }

    return (
      (updated?.[0] as Music) ?? {
        ...music,
        thumbnail_prompt: prompt,
        thumbnail_status: "failed",
      }
    );
  }
}
