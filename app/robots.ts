import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/calculateur-tps-tvq", "/conditions", "/politique-de-confidentialite"],
        disallow: ["/dashboard", "/api/", "/choose-plan", "/settings", "/expenses", "/subscription", "/success", "/verify-email", "/reset-password"],
      },
    ],
  };
}
