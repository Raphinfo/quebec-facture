-- Répare le maillon manquant de la chaîne initiale, sans supprimer de données.
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING','ACTIVE','PAST_DUE','CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING','PAID','CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyLogo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubId_key" ON "User"("stripeSubId");
CREATE TABLE IF NOT EXISTS "Client" (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, company TEXT, neq TEXT, address TEXT, email TEXT, phone TEXT,
 "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "clientId" INTEGER REFERENCES "Client"(id) ON DELETE RESTRICT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "clientCompany" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountSubtotal" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tpsAmount" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tvqAmount" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountTotal" DECIMAL(10,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS status "InvoiceStatus" NOT NULL DEFAULT 'PENDING';
CREATE TABLE IF NOT EXISTS "Expense" (
 id TEXT PRIMARY KEY, description TEXT NOT NULL, amount DECIMAL(10,2) NOT NULL, category TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);

-- Certaines bases de développement possèdent les anciens noms issus du schéma Prisma.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Client' AND column_name='companyName') THEN
   EXECUTE 'UPDATE "Client" SET company=COALESCE(company,"companyName")';
 END IF;
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Invoice' AND column_name='invoiceNumber') THEN
   EXECUTE 'UPDATE "Invoice" SET number=COALESCE(number,"invoiceNumber")';
   EXECUTE 'ALTER TABLE "Invoice" ALTER COLUMN "invoiceNumber" DROP NOT NULL';
 END IF;
END $$;
UPDATE "User" SET "companyAddress"=COALESCE("companyAddress",address);
