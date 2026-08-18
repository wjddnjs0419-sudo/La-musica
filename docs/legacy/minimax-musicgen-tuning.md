# Legacy: MiniMax and MusicGen tuning notes

> Historical reference only. Do not use this file as an input-schema contract for the active or next provider.

## Portable tuning assets

- Translate free-text intent to English before deterministic prompt compilation.
- Combine the user's concept with genre, mood, use-case, and vocal-mode presets; de-duplicate and order descriptors from overall style through rhythm, instrumentation, mix, and vocals.
- Keep copyright/reference sanitization and the canonical `[Verse]`, `[Chorus]`, and `[Bridge]` lyric structure independent from any provider input schema.
- Persist both compiled and effective prompts for diagnosis and future model evaluation.

## MiniMax-specific behavior

- MiniMax accepted a much longer, dense English descriptor prompt (roughly 2,000 characters) than the current ACE-Step adapter.
- Its provider input used `is_instrumental`; instrumental handling must not be copied to a future provider without checking that provider's schema.
- A lyricless vocal request could rely on MiniMax to improvise sung lyrics. This is not a portable guarantee.
- The integration used Replicate model-name invocation rather than ACE-Step's pinned version requirement.

## MusicGen-era context

The repository does not preserve a verified production MusicGen input adapter or benchmark suite. Treat historical MusicGen mentions as context only; do not infer field names, output shape, latency, or quality behavior from them.

## Model-switch checklist

1. Implement a new `MusicGenerationProvider` without changing generation routes or reconciliation.
2. Verify the provider's input schema, job lifecycle, output URL, duration behavior, and cost model with a live test.
3. Decide whether the portable prompt compiler and lyric format need a provider-specific preparation policy.
4. Add adapter tests for start input and every normalized status outcome.
5. Update only the active provider registry after validation; retain existing providers for in-flight jobs until they are reconciled.
