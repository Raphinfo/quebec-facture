# Québec Facture

Application SaaS de facturation pour travailleurs autonomes et petites entreprises : clients, soumissions, factures, dépenses et abonnement Pro.

## Technologies

Next.js 16 / React 19 / TypeScript, PostgreSQL via Neon, migrations Prisma, Stripe pour les abonnements et Resend pour les courriels. Node.js 22 ou 24 LTS recommandé. Les versions exactes sont verrouillées dans `package-lock.json`.

## Développement

```sh
npm ci
npm run dev
```

Configurer les variables serveur décrites dans [le guide de déploiement](docs/DEPLOIEMENT.md). Ne jamais commiter de secrets. Les migrations de fiabilité doivent être présentes avant d’utiliser la nouvelle application. L’accueil est public, l’inscription se trouve sur `/register`, et l’espace protégé sur `/dashboard`.

```sh
npm run lint
npm run typecheck
npm test
npm run test:database
npm run build
```

`npm test` vérifie les calculs, entrées et sessions sans base ni fichier d’environnement. `npm run test:database` utilise Docker et l’image `postgres:17-alpine` pour créer un conteneur temporaire sans réseau, appliquer les migrations et tester les protections transactionnelles et concurrentes. Il arrête son propre conteneur à la fin ; il n’utilise pas `DATABASE_URL`. Télécharger l’image avec `docker pull postgres:17-alpine` si nécessaire.

## Organisation

- `app/api/` : validation et autorisation serveur pour chaque opération.
- `lib/session.ts` : sessions opaques hachées, expirables et révocables.
- `lib/money.ts` : calculs en unités entières, arrondis et taxes par ligne.
- `lib/http.ts` / `lib/validation.ts` : limites des requêtes et erreurs contrôlées.
- `lib/print.ts` : documents imprimables avec échappement HTML.
- `components/DashboardWorkspace.tsx` : espace de travail et formulaires.
- `components/QuotesSection.tsx` : cycle de vie des soumissions.
- `prisma/migrations/` : schéma et fonction transactionnelle d’émission.
- `tests/` : tests métier et d’isolation.

Les factures émises ne sont pas supprimables. Les documents envoyés/émis conservent leurs coordonnées ; les conversions sont idempotentes. Les droits Pro dépendent à la fois du forfait et du statut de paiement. L’export des données reste disponible sans abonnement Pro.

## Avant une mise en ligne commerciale

Lire [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md), renouveler les identifiants de base précédemment exposés, tester la migration sur un clone, configurer les fournisseurs et finaliser les mentions légales. Aucune garantie de risque nul n’est possible. Les vérifications locales ne remplacent pas les tests Stripe/Resend et les procédures de sauvegarde sur votre infrastructure.
