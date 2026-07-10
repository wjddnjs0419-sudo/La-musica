import { PromptBox } from "@/components/prompt-box";
import type { GenerateRequest } from "@/lib/music";

type MusicComposerProps = {
  remainingCredits: number;
  error: string | null;
  onSend: (payload: GenerateRequest) => void;
};

export default function MusicComposer({
  remainingCredits,
  error,
  onSend,
}: MusicComposerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {error && (
        <p className="mb-2 px-2 text-xs text-red-400/80">Error: {error}</p>
      )}
      <PromptBox onSend={onSend} remainingCredits={remainingCredits} />
    </div>
  );
}
