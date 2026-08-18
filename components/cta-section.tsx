import AuthAwareGetStartedBadge from "@/components/auth-aware-get-started-badge";
import GetStartedBadge from "@/components/get-started-badge";
import Image from "next/image";

type CtaSectionProps = { ctaHref?: string; authAwareCta?: boolean };

export default function CtaSection({ ctaHref, authAwareCta = false }: CtaSectionProps) {
  const cta = authAwareCta ? <AuthAwareGetStartedBadge label="Create Your Track" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" /> : <GetStartedBadge href={ctaHref} label="Create Your Track" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" />;
  return <section className="relative overflow-hidden border-t border-white/[.07] bg-black px-5 py-24 text-center sm:px-8 sm:py-32 lg:px-12"><Image alt="" fill sizes="100vw" src="/cra mobile.png" className="object-cover object-center sm:hidden" /><Image alt="" fill sizes="100vw" src="/cta.png" className="hidden object-cover object-center sm:block" /><div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.72),rgba(0,0,0,.18)_72%)]" /><div className="relative z-10 mx-auto max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">La Musica</p><h2 className="mt-6 text-5xl font-semibold tracking-[-.06em] text-white sm:text-7xl">Don&apos;t just dance to it. Make it.</h2><p className="mt-5 text-lg text-white/70">Create your own reggaeton track with La Musica.</p><div className="mt-9">{cta}</div></div></section>;
}
