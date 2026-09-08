-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED'
);

-- CreateTable
CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "quoteNumber" TEXT NOT NULL,
  "amountSubtotal" DECIMAL(10,2) NOT NULL,
  "tpsAmount" DECIMAL(10,2) NOT NULL,
  "tvqAmount" DECIMAL(10,2) NOT NULL,
  "amountTotal" DECIMAL(10,2) NOT NULL,
  "items" JSONB NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "validUntil" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "clientId" INTEGER NOT NULL,
 
 CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_userId_quoteNumber_key"
ON "Quote"("userId", "quoteNumber");

-- AddForeignKey
ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_clientId_fkey"
FOREIGN KEY ("clientId")
REFERENCES "Client"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
