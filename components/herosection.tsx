"use client";

import AuthAwareGetStartedBadge from "@/components/auth-aware-get-started-badge";
import GetStartedBadge from "@/components/get-started-badge";

type HeroSectionProps = { ctaHref?: string; authAwareCta?: boolean };

export default function HeroSection({ ctaHref, authAwareCta = false }: HeroSectionProps) {
  const cta = authAwareCta ? <AuthAwareGetStartedBadge label="Create Your Track" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" /> : <GetStartedBadge href={ctaHref} label="Create Your Track" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" />;

  return <section className="relative isolate overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-28 lg:aspect-video lg:px-0 lg:py-0">
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[34rem] w-full opacity-60 sm:inset-y-0 sm:h-auto sm:opacity-100">
      <div className="absolute inset-0 bg-[url('/cra%20mobile.png')] bg-cover bg-center bg-no-repeat sm:hidden" />
      <div className="absolute inset-0 hidden bg-[url('/hero.jpg')] bg-cover bg-center bg-no-repeat sm:block" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.72)_0%,rgba(0,0,0,.48)_38%,rgba(0,0,0,0)_65%,rgba(0,0,0,0)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0)_20%,rgba(5,5,5,.35)_62%,#050505_100%)] sm:hidden" />
    </div>
    <div className="relative z-10 mx-auto flex max-w-[90rem] items-center lg:h-full lg:px-12">
      <div>
        <p className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white/65">LA MUSICA</p>
        <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[.96] tracking-[-.06em] text-white sm:text-7xl lg:text-[clamp(4rem,6vw,6.6rem)]">What if the club played your <span className="font-serif font-normal italic tracking-[-.045em]">song tonight?</span></h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Create your own reggaeton track with AI — your vibe, your lyrics, your sound.</p>
        <div className="mt-9 flex flex-wrap items-center gap-4">{cta}<p className="text-sm text-white/55">First song free · No subscription</p></div>
      </div>
    </div>
  </section>;
}
