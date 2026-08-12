import type { MetadataRoute } from "next";

const siteUrl = "https://la-musica.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth", "/workspace"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
