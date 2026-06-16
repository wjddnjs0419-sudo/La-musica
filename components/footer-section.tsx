import Link from "next/link";

import Logo from "@/components/logo";

type FooterSectionProps = {
  ctaHref?: string;
};

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function FooterSection({ ctaHref = "/auth" }: FooterSectionProps) {
  const productLinks = [
    { label: "Home", href: "/" },
    { label: "Create", href: ctaHref },
    { label: "Pricing", href: "/#pricing" },
  ];

  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 px-4 py-12 text-white sm:px-8 sm:py-16 lg:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-sky-300/40 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.09),transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-1/2 -z-10 -translate-x-1/2 whitespace-nowrap text-[clamp(3.75rem,19vw,12rem)] font-black leading-none text-white/[0.035]"
      >
        LA MUSICA
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:gap-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="La Musica home"
              className="inline-flex items-center gap-3 text-white transition-colors hover:text-sky-100"
            >
              <Logo className="h-9 w-16 shrink-0 sm:h-10 sm:w-20" />
              <span className="text-lg font-semibold sm:text-xl">
                La Musica
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
              Create AI music from a prompt, a mood, or a moment.
            </p>
          </div>

          <div className="grid gap-8 text-sm sm:grid-cols-2 sm:gap-12 md:gap-16">
            <nav aria-label="Product">
              <h2 className="text-xs font-semibold uppercase text-white/40">
                Product
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/65 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h2 className="text-xs font-semibold uppercase text-white/40">
                Legal
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/65 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} La Musica. All rights reserved.</p>
          <p className="max-w-xl text-white/40">
            AI-generated music should be reviewed for your intended use before
            publishing or licensing.
          </p>
        </div>
      </div>
    </footer>
  );
}
