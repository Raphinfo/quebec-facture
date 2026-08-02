import { neon } from '@neondatabase/serverless';

// URL PostgreSQL valide pour éviter que Neon ne rejette la chaîne lors du build Vercel
const dbUrl = process.env.DATABASE_URL || 'postgresql://user:pass@ep-placeholder-123456.us-east-1.aws.neon.tech/neondb';

export const sql = neon(dbUrl);