import CtaSection from "@/components/cta-section";
import type { Metadata } from "next";
import FooterSection from "@/components/footer-section";
import HeaderSection from "@/components/headersection";
import HowItWorksSection from "@/components/how-it-works-section";
import PricingSection from "@/components/pricing-section";
import ProductFeatureSection from "@/components/product-feature-section";
import SampleMusicSection from "@/components/sample-music-section";
import { AuthProvider } from "@/components/auth-context";
import { getLandingSampleTracks } from "@/lib/landing-samples";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Create Your Reggaeton Track with AI | La Musica",
  description:
    "Create your own Reggaeton track with AI — your vibe, lyrics, and sound. No music production experience needed.",
  alternates: {
    canonical: "/",
  },
};

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
          "A Reggaeton-first AI music creation app that turns lyrics and ideas into complete tracks.",
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
