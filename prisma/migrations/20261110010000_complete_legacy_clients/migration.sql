-- Les anciennes tables Client peuvent préexister avec seulement six colonnes.
-- CREATE TABLE IF NOT EXISTS ne complète pas une table déjà présente.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS neq TEXT;
