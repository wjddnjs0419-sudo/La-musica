import CtaSection from "@/components/cta-section";
import FooterSection from "@/components/footer-section";
import HeaderSection from "@/components/headersection";
import HeroSection from "@/components/herosection";
import HowItWorksSection from "@/components/how-it-works-section";
import PricingSection from "@/components/pricing-section";
import ProductFeatureSection from "@/components/product-feature-section";
import SampleMusicSection from "@/components/sample-music-section";
import { getLandingSampleTracks } from "@/lib/landing-samples";

export const revalidate = 3600;

const HERO_DEMO_AUDIO_URL = "https://e99zrxhb.ap-southeast.insforge.app/api/storage/buckets/musics/objects/0133b4b8-2146-4c43-9c2b-0d32aacae317%2F210e157b-8865-445f-bc68-7788f4b1a102.mp3?v=06b09f35f078cc16967e1dedb660fa67";

export default async function Home() {
  const sampleTracks = await getLandingSampleTracks();

  return (
    <main className="landing-surface min-h-screen overflow-x-hidden text-white">
      <HeaderSection authAwareCta />
      <HeroSection authAwareCta demoAudioSrc={HERO_DEMO_AUDIO_URL} />
      <SampleMusicSection tracks={sampleTracks} />
      <HowItWorksSection />
      <ProductFeatureSection />
      <PricingSection />
      <CtaSection authAwareCta />
      <FooterSection />
    </main>
  );
}
