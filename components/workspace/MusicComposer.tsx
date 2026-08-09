type MusicComposerProps = {
  disabled: boolean;
  onOpen: () => void;
  compact?: boolean;
  bar?: boolean;
  bottomOffset?: boolean;
};

export default function MusicComposer({
  disabled,
  onOpen,
  compact = false,
  bar = false,
  bottomOffset = false,
}: MusicComposerProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f4f1ea] px-4 text-sm font-medium text-black transition hover:bg-white disabled:pointer-events-none disabled:opacity-40 sm:h-11 sm:px-5"
      >
        <span className="text-lg leading-none">+</span>
        <span className="hidden sm:inline">{disabled ? "Creating..." : "Create song"}</span>
        <span className="sm:hidden">Create</span>
      </button>
    );
  }

  if (bar) {
    return (
      <div className={`fixed inset-x-0 z-40 border-t border-white/10 bg-[#0b0b0c]/[0.98] px-6 py-5 backdrop-blur-xl lg:px-12 ${bottomOffset ? "bottom-[76px]" : "bottom-0"}`}>
        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          className="mx-auto grid w-full max-w-none grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-7 text-left disabled:pointer-events-none disabled:opacity-40"
        >
          <span className="grid h-[72px] w-[72px] place-items-center border border-white/20 text-4xl font-light text-[#f4f1ea]">+</span>
          <span className="flex h-[72px] items-center border border-white/20 px-7 text-lg text-white/40">Describe a song to create...</span>
          <span className="rounded-full bg-[#f4f1ea] px-9 py-4 text-lg font-medium text-black">{disabled ? "Creating..." : "Create"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-[#303030] px-5 py-4 text-left shadow-sm transition hover:border-white/25 hover:bg-[#373737] disabled:pointer-events-none disabled:opacity-40 sm:rounded-[28px]"
      >
        <span>
          <span className="block text-sm text-white/85">Create song</span>
          <span className="mt-1 block text-xs text-white/40">
            Describe your music, lyrics, and sound.
          </span>
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xl text-black">
          +
        </span>
      </button>
    </div>
  );
}
