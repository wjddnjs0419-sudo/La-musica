import AuthAwareGetStartedBadge from "@/components/auth-aware-get-started-badge";
import GetStartedBadge from "@/components/get-started-badge";

type CtaSectionProps = { ctaHref?: string; authAwareCta?: boolean };

export default function CtaSection({ ctaHref, authAwareCta = false }: CtaSectionProps) {
  const cta = authAwareCta ? <AuthAwareGetStartedBadge label="Create your first song" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" /> : <GetStartedBadge href={ctaHref} label="Create your first song" className="!rounded-full !border-white !bg-white !px-6 !py-3 !font-semibold !text-black hover:!bg-white/85" />;
  return <section className="border-t border-white/[.07] px-5 py-24 text-center sm:px-8 sm:py-32 lg:px-12"><div className="mx-auto max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/40">La Musica</p><h2 className="mt-6 text-5xl font-semibold tracking-[-.06em] text-white sm:text-7xl">Your song is waiting.</h2><p className="mt-5 text-lg text-white/55">All you need is an idea.</p><div className="mt-9">{cta}</div></div></section>;
}
