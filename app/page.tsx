import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import CtaSection from "@/components/cta-section";
import HeaderSection from "@/components/headersection";
import HeroSection from "@/components/herosection";
import PricingSection from "@/components/pricing-section";
import SampleMusicSection from "@/components/sample-music-section";

export default async function Home() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();
  const ctaHref = data?.user ? "/workspace" : "/auth";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />

      <HeaderSection ctaHref={ctaHref} />
      <HeroSection ctaHref={ctaHref} />
      <SampleMusicSection />
      <PricingSection />
      <CtaSection ctaHref={ctaHref} />
    </main>
  );
}
