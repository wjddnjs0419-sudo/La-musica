import CtaSection from "@/components/cta-section";
import FooterSection from "@/components/footer-section";
import HeaderSection from "@/components/headersection";
import HeroSection from "@/components/herosection";
import PricingSection from "@/components/pricing-section";
import SampleMusicSection from "@/components/sample-music-section";
import { getLandingSampleTracks } from "@/lib/landing-samples";

export const revalidate = 3600;

export default async function Home() {
  const sampleTracks = await getLandingSampleTracks();

  return (
    <main className="landing-surface relative isolate min-h-screen overflow-x-hidden text-white">
      <div
        aria-hidden
        className="landing-ambient pointer-events-none absolute inset-0 -z-10"
      />

      <HeaderSection authAwareCta />
      <HeroSection authAwareCta />
      <SampleMusicSection tracks={sampleTracks} />
      <PricingSection />
      <CtaSection authAwareCta />
      <FooterSection ctaHref="/auth" />
    </main>
  );
}
