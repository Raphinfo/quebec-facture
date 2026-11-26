-- À exécuter uniquement sur l’environnement choisi, après sauvegarde et revue.
-- Ne touche à aucun compte ni document métier.
BEGIN;
DELETE FROM "Session" WHERE "expiresAt" < NOW();
DELETE FROM "PasswordReset" WHERE "expiresAt" < NOW();
DELETE FROM "VerificationToken" WHERE "expiresAt" < NOW();
DELETE FROM "RateLimit" WHERE "expiresAt" < NOW() - INTERVAL '1 day';
DELETE FROM "CheckoutAttempt" WHERE "expiresAt" < NOW() - INTERVAL '1 day';
COMMIT;
