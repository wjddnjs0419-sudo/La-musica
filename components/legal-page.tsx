import Link from "next/link";
import Logo from "@/components/logo";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  intro?: string;
  children: React.ReactNode;
};

export default function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: LegalPageProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />

      <header className="sticky top-0 z-50 w-full">
        <div className="flex w-full items-center justify-between px-3 py-5 sm:px-4 lg:px-20">
          <Link href="/" aria-label="La Musica" className="text-white">
            <Logo variant="horizontal" className="h-9 w-auto sm:h-10" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Home
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 pb-24 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-white/40">Last updated: {updatedAt}</p>
        {intro ? (
          <p className="mt-6 text-sm leading-7 text-white/65">{intro}</p>
        ) : null}

        <div className="mt-10 space-y-10 text-sm leading-7 text-white/70 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-4 [&_h3]:font-medium [&_h3]:text-white/85 [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_p]:mt-3 [&_a]:text-sky-300/80 [&_a:hover]:text-sky-200">
          {children}
        </div>
      </article>
    </main>
  );
}
