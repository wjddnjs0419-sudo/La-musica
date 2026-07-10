"use client";

import Link from "next/link";
import { useState, type SVGProps } from "react";
import AuthAwareGetStartedBadge from "@/components/auth-aware-get-started-badge";
import GetStartedBadge from "@/components/get-started-badge";
import Logo from "@/components/logo";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "/contact" },
];

type HeaderSectionProps = {
  ctaHref?: string;
  authAwareCta?: boolean;
};

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function HeaderSection({
  ctaHref,
  authAwareCta = false,
}: HeaderSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cta = authAwareCta ? (
    <AuthAwareGetStartedBadge />
  ) : (
    <GetStartedBadge href={ctaHref} />
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 md:py-5 lg:px-20">
        <Link href="/" aria-label="La Musica" className="text-white">
          <Logo variant="horizontal" className="h-8 w-auto sm:h-10" />
        </Link>

        <div className="hidden items-center gap-4 md:flex lg:gap-6">
          <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/75 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {cta}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white transition hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-white/20 md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-50 md:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-black/55 transition-opacity ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-[min(20rem,86vw)] flex-col border-l border-white/12 bg-slate-950/96 px-5 py-5 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform duration-200 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <Logo variant="horizontal" className="h-8 w-auto text-white" />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white transition hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Mobile primary" className="mt-10 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-white/78 transition hover:bg-white/[0.07] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pb-2 pt-8">
            {authAwareCta ? (
              <AuthAwareGetStartedBadge />
            ) : (
              <GetStartedBadge href={ctaHref} />
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}
