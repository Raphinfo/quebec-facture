import { PrismaClient } from '@prisma/client';

const neonUrl = "postgresql://neondb_owner:npg_0ty1BsLCrbJd@ep-frosty-firefly-atcdyplj-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// On force l'injection globale avant l'instanciation
if (typeof window === 'undefined') {
  process.env.DATABASE_URL = neonUrl;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Instanciation complètement vide pour satisfaire TypeScript et éviter l'erreur ts(2353)
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;