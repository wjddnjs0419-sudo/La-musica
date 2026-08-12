import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://la-musica.vercel.app"),
  title: {
    default: "AI Music Generator | La Musica",
    template: "%s | La Musica",
  },
  description:
    "Create original songs from lyrics and ideas with La Musica, an AI music generator for everyone.",
  applicationName: "La Musica",
  keywords: ["AI music generator", "AI song generator", "lyrics to song", "AI music creation"],
  icons: {
    icon: [{ url: "/logo icon.png", type: "image/png" }],
    apple: [{ url: "/logo icon.png", type: "image/png" }],
  },
  openGraph: {
    title: "AI Music Generator | La Musica",
    description:
      "Turn your lyrics and ideas into complete songs with AI. No experience or equipment needed.",
    url: "https://la-musica.vercel.app",
    siteName: "La musica",
    images: [{ url: "/og-image.png", width: 1731, height: 909, alt: "La musica" }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Music Generator | La Musica",
    description:
      "Turn your lyrics and ideas into complete songs with AI. No experience or equipment needed.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
      {gaMeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`}
          </Script>
        </>
      ) : null}
    </html>
  );
}
