/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Empêche les erreurs de build si TypeScript rouspète sur les types stricts */
  typescript: {
    ignoreBuildErrors: false,
  },
  /* Configuration expérimentale pour désactiver la collecte statique agressive */
  experimental: {
    // Si tu es sous Next 15+
  }
};

export default nextConfig;