import { neon } from "@neondatabase/serverless";
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configuration de la base de données manquante.");
  return neon(process.env.DATABASE_URL);
}
