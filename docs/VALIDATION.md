# Vérifications réalisées le 10 novembre 2026

## Résultats

| Contrôle exécuté | Résultat |
| --- | --- |
| `npm run lint` | Réussi, aucune erreur ni avertissement |
| `npm run typecheck` | Réussi |
| `npm test` | 16 tests réussis : calculs, entrées, sessions, cookies falsifiés et révocation |
| `npm run test:database` | Chaîne complète de migrations sur PostgreSQL 17 jetable ; isolation intercompte, quota, impayé, échéance des droits, instantanés, conservation des documents et idempotence validés |
| Concurrence PostgreSQL | 8 émissions simultanées : exactement 3 factures pour le forfait gratuit |
| `npm run build` | Réussi avec Prisma 7.10.1 et Next.js 16.4.6 / Turbopack dans une copie isolée sans `.env` |
| `npm audit --omit=dev --audit-level=moderate` | Aucune vulnérabilité signalée dans les dépendances de production à cette date |
| Chrome, pages publiques | 10 pages contrôlées ; vérifications de débordement sur ordinateur et mobile ; aucune exception JavaScript détectée |
| Chrome, protections HTTP | Redirection du tableau de bord privé ; 7 API refusent l’accès sans session malgré un ancien cookie falsifié ; origine étrangère refusée ; déconnexion GET refusée ; en-têtes présents |
| Chrome, tableau de bord | 5 onglets sur ordinateur/mobile, création de facture avec clé d’idempotence et thème sombre ; API remplacées par des données fictives pour ces vérifications visuelles |
| `git diff --check` | Réussi |

Les tests PostgreSQL utilisent uniquement des conteneurs nommés pour cette tâche et ne lisent pas `DATABASE_URL`. Les tests unitaires n’ouvrent aucun fichier d’environnement. La compilation utilise une copie des seuls dossiers/fichiers nécessaires, une configuration Prisma factice et aucune base réelle. La prévisualisation visuelle sans authentification n’existe que dans cette copie jetable, jamais dans le dépôt livré.

## Limites explicites

- Le schéma et les données de votre base réelle n’ont pas été consultés. La migration de cette base doit être répétée sur un clone et accompagnée d’une sauvegarde restaurable.
- Les accès réels Stripe/Resend, les paiements, les courriels et la délivrabilité n’ont pas été testés. Aucun paiement ni courriel n’a été émis par l’assistant.
- Les sauvegardes, l’alerte d’incident, le contrôle réseau/WAF et les tâches de maintenance doivent être activés sur votre infrastructure.
- Les identifiants PostgreSQL autrefois présents dans les sources doivent être renouvelés chez le fournisseur ; leur suppression du code n’est pas une révocation.
- L’audit npm ne prouve pas une absence de toutes les vulnérabilités. Les vérifications effectuées ne constituent ni un audit d’intrusion exhaustif ni une validation juridique/fiscale.
- Aucun fichier `.env` existant n’a été lu ou modifié. Aucun déploiement, commit ni push n’a été réalisé.

Voir [le guide de mise en service](DEPLOIEMENT.md) avant ouverture commerciale.
