import { neon } from '@neondatabase/serverless';

export function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    // Si la variable manque au build, on renvoie une instance factice
    return neon('postgresql://user:pass@ep-placeholder-123456.us-east-1.aws.neon.tech/neondb');
  }
  return neon(dbUrl);
}