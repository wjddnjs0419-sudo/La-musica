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
    <main className="min-h-screen bg-[#050505] text-[#f4f1ea]">
      <header className="h-[90px] border-b border-white/10">
        <div className="mx-auto flex h-full w-full max-w-[90rem] items-center justify-between px-6 sm:px-10 lg:px-12">
          <Link href="/" aria-label="La Musica" className="text-[#f4f1ea]">
            <Logo variant="horizontal" className="h-7 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm text-white/50 transition-colors hover:text-[#f4f1ea]"
          >
            Back to home
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-14 sm:px-10 sm:pt-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#f4f1ea] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-white/40">Last updated: {updatedAt}</p>
        {intro ? (
          <p className="mt-8 text-base leading-8 text-white/65">{intro}</p>
        ) : null}

        <div className="mt-10 border-t border-white/10 pt-10">
          <div className="space-y-12 text-base leading-8 text-white/65 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-[-0.02em] [&_h2]:text-[#f4f1ea] [&_h3]:mt-5 [&_h3]:font-medium [&_h3]:text-white/85 [&_li]:mt-2 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_p]:mt-4 [&_a]:text-[#f4f1ea] [&_a]:underline [&_a]:decoration-white/30 [&_a]:underline-offset-4 [&_a:hover]:decoration-white">
          {children}
          </div>
        </div>
      </article>
    </main>
  );
}
