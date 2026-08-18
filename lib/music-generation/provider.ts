import { REPLICATE_ACE_STEP_PROVIDER_ID, replicateAceStepProvider } from "./providers/replicate-ace-step";

const providers = new Map([[REPLICATE_ACE_STEP_PROVIDER_ID, replicateAceStepProvider]]);
export function getActiveMusicGenerationProvider() { return replicateAceStepProvider; }
export function getMusicGenerationProvider(id: string) { return providers.get(id) ?? null; }
