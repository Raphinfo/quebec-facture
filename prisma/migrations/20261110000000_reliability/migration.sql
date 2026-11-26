ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'SENDING';
-- Échec volontaire en cas de doublons : aucune suppression automatique de données.
CREATE UNIQUE INDEX IF NOT EXISTS "User_normalized_email_key" ON "User"(LOWER(TRIM(email)));
CREATE TABLE "Session" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "expiresAt" TIMESTAMPTZ(3) NOT NULL);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "RateLimit" (key TEXT PRIMARY KEY, count INTEGER NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL);
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
CREATE TABLE "PasswordReset" ("tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, "expiresAt" TIMESTAMPTZ(3) NOT NULL);
ALTER TABLE "User" ADD COLUMN "invoiceSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "invoicesIssued" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "subscriptionValidUntil" TIMESTAMPTZ(3);
ALTER TABLE "User" ADD COLUMN "quoteSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "trialUsed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN "checkoutSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN "checkoutExpiresAt" TIMESTAMP(3);
UPDATE "User" SET "trialUsed"=TRUE WHERE "stripeSubId" IS NOT NULL;
UPDATE "User" u SET
 "invoicesIssued"=(SELECT COUNT(*) FROM "Invoice" i WHERE i."userId"=u.id),
 "invoiceSequence"=GREATEST((SELECT COUNT(*) FROM "Invoice" i WHERE i."userId"=u.id),(SELECT COALESCE(MAX(substring(i.number from '[0-9]+$')::bigint),0) FROM "Invoice" i WHERE i."userId"=u.id AND i.number ~ '^FAC-[0-9]{4}-[0-9]{1,9}$')),
 "quoteSequence"=GREATEST((SELECT COUNT(*) FROM "Quote" q WHERE q."userId"=u.id),(SELECT COALESCE(MAX(substring(q."quoteNumber" from '[0-9]+$')::bigint),0) FROM "Quote" q WHERE q."userId"=u.id AND q."quoteNumber" ~ '^SOU-[0-9]{4}-[0-9]{1,9}$'));
ALTER TABLE "Invoice" ADD COLUMN "issuerSnapshot" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "clientSnapshot" JSONB;
ALTER TABLE "Invoice" ADD COLUMN "sourceQuoteId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Invoice_userId_number_key" ON "Invoice"("userId",number);
CREATE UNIQUE INDEX "Invoice_sourceQuoteId_key" ON "Invoice"("sourceQuoteId");
CREATE UNIQUE INDEX "Invoice_userId_requestKey_key" ON "Invoice"("userId","requestKey");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId","createdAt");
CREATE INDEX "Client_userId_idx" ON "Client"("userId");
CREATE INDEX "Expense_userId_createdAt_idx" ON "Expense"("userId","createdAt");
CREATE INDEX "Quote_userId_createdAt_idx" ON "Quote"("userId","createdAt");
ALTER TABLE "Quote" ADD COLUMN "issuerSnapshot" JSONB;
ALTER TABLE "Quote" ADD COLUMN "clientSnapshot" JSONB;
ALTER TABLE "Quote" ADD COLUMN "emailId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
-- Figer les informations connues au moment de la migration ; l'état historique exact ne peut être reconstruit.
UPDATE "Invoice" i SET "issuerSnapshot"=jsonb_build_object('companyName',u."companyName",'companyAddress',u."companyAddress",'tpsNumber',u."tpsNumber",'tvqNumber',u."tvqNumber",'companyLogo',u."companyLogo") FROM "User" u WHERE u.id=i."userId";
UPDATE "Invoice" i SET "clientSnapshot"=jsonb_build_object('name',i."clientName",'company',i."clientCompany",'email',i."clientEmail",'address',i."clientAddress");
-- Interdire les suppressions en cascade de documents comptables par suppression d'un client.
DO $$ DECLARE r RECORD; BEGIN
 FOR r IN SELECT conname,conrelid::regclass AS rel FROM pg_constraint WHERE contype='f' AND confrelid='"Client"'::regclass AND conrelid IN ('"Invoice"'::regclass,'"Quote"'::regclass) LOOP
   EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',r.rel,r.conname);
 END LOOP;
END $$;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE RESTRICT;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE RESTRICT;

-- Une fonction transactionnelle sérialise les émissions par entreprise. Toute erreur annule toute l'opération.
CREATE OR REPLACE FUNCTION qf_issue_invoice(uid TEXT, cid INTEGER, document JSONB, qid TEXT, request_key TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE u "User"%ROWTYPE; c "Client"%ROWTYPE; q "Quote"%ROWTYPE; existing "Invoice"%ROWTYPE;
 iid TEXT; num TEXT; payload JSONB; issuer JSONB; customer JSONB;
BEGIN
 SELECT * INTO u FROM "User" WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','Session invalide.','status',401); END IF;
 SELECT * INTO existing FROM "Invoice" WHERE "userId"=uid AND ((request_key IS NOT NULL AND "requestKey"=request_key) OR (qid IS NOT NULL AND "sourceQuoteId"=qid));
 IF FOUND THEN RETURN jsonb_build_object('invoiceId',existing.id,'invoiceNumber',existing.number,'total',existing."amountTotal",'replayed',true); END IF;
 IF NOT (u.plan='PRO' AND u."subscriptionStatus"::text IN ('ACTIVE','TRIALING') AND COALESCE(u."subscriptionValidUntil">NOW(),FALSE)) AND u."invoicesIssued">=3 THEN
 RETURN jsonb_build_object('error','Le forfait gratuit permet d’émettre trois factures. Un abonnement actif est nécessaire pour continuer.','status',403); END IF;
 IF qid IS NOT NULL THEN
   SELECT * INTO q FROM "Quote" WHERE id=qid AND "userId"=uid FOR UPDATE;
   IF NOT FOUND OR q.status::text<>'ACCEPTED' THEN RETURN jsonb_build_object('error','La soumission doit être acceptée avant sa conversion.','status',409); END IF;
   cid:=q."clientId";
   payload:=jsonb_build_object('items',q.items,'amountSubtotal',q."amountSubtotal",'tpsAmount',q."tpsAmount",'tvqAmount',q."tvqAmount",'amountTotal',q."amountTotal");
 ELSE payload:=document; END IF;
 SELECT * INTO c FROM "Client" WHERE id=cid AND "userId"=uid FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','Client introuvable.','status',404); END IF;
 IF NULLIF(TRIM(u."companyName"),'') IS NULL OR NULLIF(TRIM(u."companyAddress"),'') IS NULL THEN RETURN jsonb_build_object('error','Complétez le nom et l’adresse de votre entreprise avant d’émettre une facture.','status',400); END IF;
 UPDATE "User" SET "invoiceSequence"="invoiceSequence"+1,"invoicesIssued"="invoicesIssued"+1 WHERE id=uid RETURNING * INTO u;
 num:='FAC-'||to_char(CURRENT_DATE,'YYYY')||'-'||lpad(u."invoiceSequence"::text,GREATEST(6,length(u."invoiceSequence"::text)),'0');
 iid:=gen_random_uuid()::text;
 issuer:=COALESCE(q."issuerSnapshot",jsonb_build_object('companyName',u."companyName",'companyAddress',u."companyAddress",'tpsNumber',u."tpsNumber",'tvqNumber',u."tvqNumber",'companyLogo',u."companyLogo"));
 customer:=COALESCE(q."clientSnapshot",jsonb_build_object('name',c.name,'company',c.company,'email',c.email,'address',c.address));
 INSERT INTO "Invoice" (id,number,"clientId","clientName","clientCompany","clientEmail","clientAddress","userId","itemsJson",items,"sousTotal","amountSubtotal","totalTPS","tpsAmount","totalTVQ","tvqAmount","totalGlobal","amountTotal",status,"issuerSnapshot","clientSnapshot","sourceQuoteId","requestKey")
 VALUES (iid,num,cid,customer->>'name',customer->>'company',customer->>'email',customer->>'address',uid,(payload->'items')::text,payload->'items',(payload->>'amountSubtotal')::numeric,(payload->>'amountSubtotal')::numeric,(payload->>'tpsAmount')::numeric,(payload->>'tpsAmount')::numeric,(payload->>'tvqAmount')::numeric,(payload->>'tvqAmount')::numeric,(payload->>'amountTotal')::numeric,(payload->>'amountTotal')::numeric,'PENDING',issuer,customer,qid,request_key);
 IF qid IS NOT NULL THEN UPDATE "Quote" SET status='CONVERTED',"updatedAt"=NOW(),version=version+1 WHERE id=qid; END IF;
 RETURN jsonb_build_object('invoiceId',iid,'invoiceNumber',num,'total',(payload->>'amountTotal')::numeric);
END $$;

CREATE TABLE "CheckoutAttempt" ("userId" TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,id TEXT NOT NULL,trial BOOLEAN NOT NULL,"expiresAt" TIMESTAMPTZ(3) NOT NULL);

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE TABLE "VerificationToken" ("tokenHash" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,"expiresAt" TIMESTAMPTZ(3) NOT NULL);
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");
