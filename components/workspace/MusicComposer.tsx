import { PromptBox } from "@/components/prompt-box";
import type { Ref } from "react";
import type { GenerateRequest } from "@/lib/music";

type MusicComposerProps = {
  remainingCredits: number;
  error: string | null;
  onSend: (payload: GenerateRequest) => void;
  inputRef?: Ref<HTMLTextAreaElement>;
};

export default function MusicComposer({
  remainingCredits,
  error,
  onSend,
  inputRef,
}: MusicComposerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {error && (
        <p className="mb-2 px-2 text-xs text-red-400/80">Error: {error}</p>
      )}
      <PromptBox ref={inputRef} onSend={onSend} remainingCredits={remainingCredits} />
    </div>
  );
}
