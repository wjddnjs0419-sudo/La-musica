import Replicate from "replicate";
import { createAdminClient } from "@insforge/sdk";

const userId = "0133b4b8-2146-4c43-9c2b-0d32aacae317";
const lyrics = "In the quiet of the morning,\nI find myself alone,\nChasing all my shadows,\nThrough the streets I call my home.";
const admin = createAdminClient({ baseUrl: process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL, apiKey: process.env.INSFORGE_API_KEY });
const { data: music, error } = await admin.database.rpc("create_music_with_credit", { p_user_id: userId, p_prompt: "Warm indie folk, intimate acoustic guitar, gentle piano, reflective morning mood, soft male vocal", p_title: "Morning Shadows", p_model: "fishaudio/ace-step-1.5", p_metadata: { hero_demo: true, lyrics, lyrics_source: "user", instrumental: false } });
if (error || !music) throw error ?? new Error("demo reservation failed");
const replicate = new Replicate();
const prediction = await replicate.predictions.create({ version: "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85", input: { prompt: "warm indie folk, intimate acoustic guitar, gentle piano, reflective morning mood, soft male vocal", lyrics, duration: 180, audio_format: "mp3" } });
const { error: updateError } = await admin.database.from("musics").update({ status: "processing", is_public: true, metadata: { hero_demo: true, lyrics, lyrics_source: "user", instrumental: false, prediction_id: prediction.id } }).eq("id", music.id);
if (updateError) throw updateError;
console.log(JSON.stringify({ id: music.id, predictionId: prediction.id }));
