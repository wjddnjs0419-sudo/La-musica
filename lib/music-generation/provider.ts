import { REPLICATE_ACE_STEP_PROVIDER_ID, replicateAceStepProvider } from "./providers/replicate-ace-step";
import {
  REPLICATE_GOOGLE_LYRIA_3_PRO_PROVIDER_ID,
  replicateGoogleLyria3ProProvider,
} from "./providers/replicate-google-lyria-3-pro";

const providers = new Map([
  [REPLICATE_ACE_STEP_PROVIDER_ID, replicateAceStepProvider],
  [REPLICATE_GOOGLE_LYRIA_3_PRO_PROVIDER_ID, replicateGoogleLyria3ProProvider],
]);

export function getActiveMusicGenerationProvider() {
  return replicateGoogleLyria3ProProvider;
}
export function getMusicGenerationProvider(id: string) { return providers.get(id) ?? null; }
