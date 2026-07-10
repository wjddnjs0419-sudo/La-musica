import Logo from "@/components/logo";

export default function Loading() {
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />
      <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="relative flex flex-wrap items-center gap-3 px-1 py-3 sm:flex-nowrap sm:gap-4 sm:px-2">
          <Logo className="order-1 h-7 w-auto shrink-0 text-white sm:order-none sm:h-8" />
          <div className="relative order-3 flex w-full justify-center sm:order-none sm:flex-1">
            <div className="h-10 w-full animate-pulse rounded-full border border-white/12 bg-white/[0.05] sm:max-w-md" />
          </div>
          <div className="order-2 ml-auto h-9 w-9 animate-pulse rounded-full bg-white/15 sm:order-none sm:ml-0" />
        </div>
      </header>

      <main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-4 sm:px-4 md:py-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid min-h-20 animate-pulse grid-cols-[38px_42px_minmax(0,1fr)_32px] items-center gap-2 rounded-lg border border-white/7 bg-[#171a20]/80 px-3 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.16)] sm:grid-cols-[42px_44px_minmax(0,1fr)_36px] sm:gap-3 sm:px-4"
              >
                <div className="h-9 w-9 rounded-lg bg-white/[0.08]" />
                <div className="h-10 w-10 rounded-md bg-white/[0.08] sm:h-11 sm:w-11" />
                <div className="min-w-0">
                  <div className="h-3.5 w-2/3 rounded bg-white/[0.1]" />
                  <div className="mt-2 h-2.5 w-32 rounded bg-white/[0.06]" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="w-full shrink-0 px-3 pb-4 sm:px-4 sm:pb-6">
        <div className="mx-auto h-16 w-full max-w-3xl animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
      </div>
    </div>
  );
}
