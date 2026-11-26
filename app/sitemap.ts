import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "https://quebec-facture.ca";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/calculateur-tps-tvq`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    { url: `${base}/conditions`, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${base}/politique-de-confidentialite`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
