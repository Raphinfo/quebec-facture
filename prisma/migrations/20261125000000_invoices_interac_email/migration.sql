-- Ajout des préférences de paiement (Interac, délai) et suivi d'envoi/échéance des factures.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interacEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentTermsDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" DATE;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMPTZ(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emailId" TEXT;

CREATE OR REPLACE FUNCTION qf_issue_invoice(uid TEXT, cid INTEGER, document JSONB, qid TEXT, request_key TEXT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE u "User"%ROWTYPE; c "Client"%ROWTYPE; q "Quote"%ROWTYPE; existing "Invoice"%ROWTYPE;
 iid TEXT; num TEXT; payload JSONB; issuer JSONB; customer JSONB; due DATE;
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
 due:=CURRENT_DATE + LEAST(365, GREATEST(0, COALESCE(u."paymentTermsDays", 30)));
 issuer:=COALESCE(q."issuerSnapshot",jsonb_build_object('companyName',u."companyName",'companyAddress',u."companyAddress",'tpsNumber',u."tpsNumber",'tvqNumber',u."tvqNumber",'companyLogo',u."companyLogo",'interacEmail',u."interacEmail"));
 customer:=COALESCE(q."clientSnapshot",jsonb_build_object('name',c.name,'company',c.company,'email',c.email,'address',c.address));
 INSERT INTO "Invoice" (id,number,"clientId","clientName","clientCompany","clientEmail","clientAddress","userId","itemsJson",items,"sousTotal","amountSubtotal","totalTPS","tpsAmount","totalTVQ","tvqAmount","totalGlobal","amountTotal",status,"issuerSnapshot","clientSnapshot","sourceQuoteId","requestKey","dueDate")
 VALUES (iid,num,cid,customer->>'name',customer->>'company',customer->>'email',customer->>'address',uid,(payload->'items')::text,payload->'items',(payload->>'amountSubtotal')::numeric,(payload->>'amountSubtotal')::numeric,(payload->>'tpsAmount')::numeric,(payload->>'tpsAmount')::numeric,(payload->>'tvqAmount')::numeric,(payload->>'tvqAmount')::numeric,(payload->>'amountTotal')::numeric,(payload->>'amountTotal')::numeric,'PENDING',issuer,customer,qid,request_key,due);
 IF qid IS NOT NULL THEN UPDATE "Quote" SET status='CONVERTED',"updatedAt"=NOW(),version=version+1 WHERE id=qid; END IF;
 RETURN jsonb_build_object('invoiceId',iid,'invoiceNumber',num,'total',(payload->>'amountTotal')::numeric);
END $$;
