import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import CtaSection from "@/components/cta-section";
import FooterSection from "@/components/footer-section";
import HeaderSection from "@/components/headersection";
import HeroSection from "@/components/herosection";
import PricingSection from "@/components/pricing-section";
import SampleMusicSection from "@/components/sample-music-section";
import { getLandingSampleTracks } from "@/lib/landing-samples";

export default async function Home() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();
  const ctaHref = data?.user ? "/workspace" : "/auth";
  const sampleTracks = await getLandingSampleTracks();

  return (
    <main className="landing-surface relative isolate min-h-screen overflow-x-hidden text-white">
      <div
        aria-hidden
        className="landing-ambient pointer-events-none absolute inset-0 -z-10"
      />

      <HeaderSection ctaHref={ctaHref} />
      <HeroSection ctaHref={ctaHref} />
      <SampleMusicSection tracks={sampleTracks} />
      <PricingSection />
      <CtaSection ctaHref={ctaHref} />
      <FooterSection ctaHref={ctaHref} />
    </main>
  );
}
