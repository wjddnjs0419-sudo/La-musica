"use client";

import Link from "next/link";
import { useState } from "react";
import AuthAwareGetStartedBadge from "@/components/auth-aware-get-started-badge";
import GetStartedBadge from "@/components/get-started-badge";
import Logo from "@/components/logo";

type HeaderSectionProps = { ctaHref?: string; authAwareCta?: boolean };
const navItems = [{ label: "Pricing", href: "#pricing" }];

export default function HeaderSection({ ctaHref, authAwareCta = false }: HeaderSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const create = authAwareCta ? <AuthAwareGetStartedBadge label="Create" className="!rounded-full !border-white !bg-white !px-4 !py-2 !text-black hover:!bg-white/85" /> : <GetStartedBadge href={ctaHref} label="Create" className="!rounded-full !border-white !bg-white !px-4 !py-2 !text-black hover:!bg-white/85" />;
  return <header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#050505]/80 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12"><Link href="/" aria-label="La Musica home"><Logo variant="horizontal" className="h-7 w-auto sm:h-8" /></Link><nav className="hidden items-center gap-7 md:flex"><Link href="#pricing" className="text-sm text-white/60 transition hover:text-white">Pricing</Link><Link href="/auth" className="text-sm text-white/60 transition hover:text-white">Sign in</Link>{create}</nav><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white md:hidden"><span className="text-lg leading-none">{menuOpen ? "×" : "≡"}</span></button></div>{menuOpen ? <div className="border-t border-white/[.07] bg-[#0b0b0c] px-5 py-5 md:hidden"><nav className="flex flex-col gap-2" aria-label="Mobile navigation">{navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/70 hover:bg-white/[.06]">{item.label}</Link>)}<Link href="/auth" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-white/70 hover:bg-white/[.06]">Sign in</Link><div className="mt-2" onClick={() => setMenuOpen(false)}>{create}</div></nav></div> : null}</header>;
}
