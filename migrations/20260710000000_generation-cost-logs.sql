-- Track estimated generation costs per song for pricing and margin analysis.
-- No foreign-key constraint on music_id intentionally: rows survive music deletion.
create table if not exists generation_cost_logs (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  music_id                  uuid,
  prediction_id             text,
  music_model               text not null,
  duration_seconds          int,
  translation_used          boolean not null default false,
  lyrics_generation_used    boolean not null default false,
  style_refine_used         boolean not null default false,
  estimated_music_cost_usd  numeric,
  estimated_gemini_cost_usd numeric,
  estimated_total_cost_usd  numeric,
  created_at                timestamptz not null default now()
);

-- RLS: only the service role (admin client) can insert/read — no user-facing access.
alter table generation_cost_logs enable row level security;

create index if not exists generation_cost_logs_user_id_idx
  on generation_cost_logs (user_id);

create index if not exists generation_cost_logs_created_at_idx
  on generation_cost_logs (created_at desc);
