import Link from "next/link";

import FooterSection from "@/components/footer-section";
import GetStartedBadge from "@/components/get-started-badge";
import Logo from "@/components/logo";

const CONTACT_EMAIL = "wjddnjs0419@hufs.ac.kr";

export default function ContactPage() {
  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="landing-ambient pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.14),transparent_58%)]"
      />

      <header className="sticky top-0 z-50 w-full">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 md:py-5 lg:px-20">
          <Link href="/" aria-label="La Musica" className="text-white">
            <Logo variant="horizontal" className="h-8 w-auto sm:h-10" />
          </Link>

          <nav aria-label="Contact page navigation" className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Home
            </Link>
            <div className="hidden sm:block">
              <GetStartedBadge href="/?auth=1" />
            </div>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-32">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/70">
            Contact
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Let&apos;s talk about La Musica.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
            Product questions, collaboration ideas, account issues, or feedback
            are welcome. Send a note and we&apos;ll get back to you as soon as
            possible.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <section className="relative overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent"
            />
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Email us directly
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/62 sm:text-base">
              For support or inquiries, please contact us at the address below.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-7 inline-flex max-w-full items-center justify-center rounded-[20px] border border-white/70 px-4 py-2 text-sm font-medium leading-none text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-black"
            >
              <span className="truncate">{CONTACT_EMAIL}</span>
            </a>
          </section>

          <section className="rounded-[8px] border border-white/10 bg-black/20 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              What to include
            </h2>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-white/62 sm:text-base">
              <li>
                Your account email if the message is about login, credits, or a
                generated track.
              </li>
              <li>
                A short description of what happened, including the prompt or
                track title when relevant.
              </li>
              <li>
                Links or screenshots only when they help explain the issue.
              </li>
            </ul>
          </section>
        </div>
      </section>

      <FooterSection />
    </main>
  );
}
