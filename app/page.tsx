import CtaSection from "@/components/cta-section";
import type { Metadata } from "next";
import FooterSection from "@/components/footer-section";
import HeaderSection from "@/components/headersection";
import HeroSection from "@/components/herosection";
import HowItWorksSection from "@/components/how-it-works-section";
import PricingSection from "@/components/pricing-section";
import ProductFeatureSection from "@/components/product-feature-section";
import SampleMusicSection from "@/components/sample-music-section";
import { AuthProvider } from "@/components/auth-context";
import { getLandingSampleTracks } from "@/lib/landing-samples";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI Music Generator — Create Songs from Lyrics",
  description:
    "Create original songs from your lyrics and ideas with La Musica's AI music generator. Start free — no music production experience needed.",
  alternates: {
    canonical: "/",
  },
};

const HERO_DEMO_AUDIO_URL = "https://e99zrxhb.ap-southeast.insforge.app/api/storage/buckets/musics/objects/0133b4b8-2146-4c43-9c2b-0d32aacae317%2F210e157b-8865-445f-bc68-7788f4b1a102.mp3?v=06b09f35f078cc16967e1dedb660fa67";

export default async function Home() {
  const sampleTracks = await getLandingSampleTracks();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "La Musica",
        url: "https://la-musica.vercel.app",
        logo: "https://la-musica.vercel.app/logo-icon-dark.svg",
      },
      {
        "@type": "WebApplication",
        name: "La Musica",
        url: "https://la-musica.vercel.app",
        applicationCategory: "MusicApplication",
        operatingSystem: "Web",
        description:
          "An AI music generator that turns lyrics and ideas into complete songs.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <AuthProvider>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
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
    </AuthProvider>
  );
}
