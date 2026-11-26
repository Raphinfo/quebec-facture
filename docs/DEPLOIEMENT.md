# Mise en service de Québec Facture

Le code a été renforcé et testé localement. Ce document distingue la livraison du code de la mise en service commerciale. Aucun fichier `.env` existant n’a été lu ou modifié pendant cette intervention. Aucune migration n’a été appliquée à la base réelle.

## Action préalable : renouveler la connexion exposée

Une connexion PostgreSQL avec mot de passe figurait dans `lib/prisma.ts`, fichier suivi par Git. Elle a été retirée du code. Renouveler le mot de passe/rôle correspondant dans Neon, mettre à jour le secret de l’hébergeur, puis vérifier les accès. Retirer une chaîne du dernier commit ne la retire pas des copies ou de l’historique. Ne jamais réutiliser l’ancien mot de passe. La réécriture éventuelle de l’historique nécessite une intervention coordonnée séparée.

## Configuration serveur

Injecter les valeurs via le gestionnaire de secrets de l’hébergeur. Ne pas les commiter. Les noms ci-dessous ne contiennent aucune valeur réelle.

| Variable | Utilisation |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL Neon avec TLS ; rôle applicatif au moindre privilège |
| `APP_URL` | Origine HTTPS publique exacte, sans chemin ; obligatoire en production pour les contrôles d’origine, Stripe et les liens de courriel |
| `STRIPE_SECRET_KEY` | Clé du compte Stripe approprié ; séparer test et production |
| `STRIPE_PRICE_ID` | Prix actif en CAD, 1 500 cents, récurrent mensuel ; concordance vérifiée avant Checkout |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature de l’endpoint `/api/webhook/stripe` |
| `RESEND_API_KEY` | Clé limitée à l’envoi sur le domaine vérifié |
| `RESEND_FROM_EMAIL` | Expéditeur de votre domaine vérifié ; jamais `onboarding@resend.dev` en production |
| `SUPPORT_EMAIL` | Boîte réellement surveillée pour le support |
| `PRIVACY_EMAIL` | Contact pour les demandes de confidentialité (sinon support) |
| `PRIVACY_OFFICER_TITLE` | Titre du responsable désigné de la protection des renseignements personnels |

Les contrôles d’origine doivent correspondre à l’URL exacte du navigateur, y compris le port en développement. Les scripts qui appellent une API de mutation doivent transmettre une origine autorisée. Le webhook Stripe est exempt de ce contrôle et vérifie sa signature.

## Base existante : procédure de migration

1. Effectuer une sauvegarde et vérifier sa restauration sur une base distincte. Conserver les comptes et documents existants.
2. Cloner la base dans un environnement de préproduction. Vérifier les doublons de courriels normalisés et de numéros de factures par entreprise, les documents liés à un client d’un autre compte et la validité des anciennes lignes JSON. Corriger les anomalies après revue, sans suppression automatique.
3. Exécuter `npx prisma migrate status`, puis `npx prisma migrate deploy` sur cette copie avec une connexion dédiée. Ne pas utiliser `prisma db push`, `migrate reset` ou une résolution artificielle de migration échouée.
4. La migration additive `20260704000000_complete_core_schema` complète le maillon absent de l’historique initial. Les migrations existantes n’ont pas été réécrites. Les nouvelles tables/colonnes et la fonction `qf_issue_invoice` sont créées par `20261110000000_reliability`.
5. Les index uniques échouent volontairement si des doublons existent : aucun document n’est supprimé. Le schéma réel historique n’a pas pu être inspecté ; adapter une migration corrective si la copie révèle une autre divergence.
6. Vérifier les totaux, compteurs, documents et associations avant/après. L’instantané des anciennes factures conserve les informations disponibles au moment de la migration ; il ne reconstruit pas les coordonnées historiques perdues.
7. Prévoir une courte fenêtre de maintenance pour migrer la production, puis déployer le code. Ne pas faire fonctionner longtemps l’ancienne version à côté de la nouvelle : les anciennes routes ne maintiennent pas les compteurs et sessions sécurisés.
8. Tous les utilisateurs devront se reconnecter. Les abonnements existants doivent être resynchronisés via l’onglet Abonnement ou leurs webhooks : une date de fin de droits connue est désormais exigée pour émettre au-delà du quota gratuit. Les anciens cookies `user_session` sont volontairement refusés. Une confirmation de courriel sera demandée avant l’envoi de soumissions.

## Validation métier avant ouverture

- Deux comptes distincts : aucun accès croisé aux clients, documents, dépenses, export et portail Stripe.
- Compte gratuit : trois émissions au total, y compris sous requêtes simultanées ; une annulation ne libère pas de quota.
- Soumission : brouillon → envoi → acceptation saisie par le propriétaire → conversion ; double clic/reprise ne crée pas deux factures.
- Vérifier les taxes avec un professionnel selon les activités visées. Le moteur prend les numéros du profil et les choix par ligne ; il ne décide pas de l’assujettissement réel de l’entreprise. Les taxes sont arrondies sur le total taxable par taxe ; les lignes sont arrondies au cent.
- Impression : accents, longues descriptions, plusieurs pages, coordonnées figées, logo raster, numéros uniques.
- Abonnement Stripe en mode test : essai, paiement réussi/refusé, impayé, annulation, renouvellement, événements dupliqués et retardés. Les tests locaux n’envoient aucun paiement réel.
- Événements à activer : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. `invoice.payment_succeeded` est également compris pour compatibilité.
- Configurer les taxes de votre propre abonnement SaaS, les modalités d’annulation et le portail dans Stripe selon votre situation. La facturation des clients de vos utilisateurs reste manuelle : marquer « payée » ne déclenche aucun encaissement.
- Vérifier le domaine Resend et les enregistrements DNS recommandés. Tester les liens de récupération et confirmation avec des comptes de test.
- Envoi incertain de soumission : le statut `SENDING` conserve le contenu et la clé d’idempotence. Une reprise est possible pendant 23 h ; au-delà, vérifier l’identifiant d’envoi dans Resend avant toute correction manuelle, pour éviter un doublon après expiration de leur clé.

## Exploitation

- Activer les sauvegardes et la restauration à un instant donné selon l’offre Neon ; tester périodiquement la restauration. Un export JSON utilisateur est une copie de données, pas un mécanisme de restauration complète du service.
- Surveiller les erreurs HTTP 5xx, les échecs d’envoi et les livraisons de webhooks Stripe. Les réponses d’erreur internes comportent une référence de corrélation et n’exposent pas le détail SQL.
- Prévoir une vérification régulière de cohérence entre les abonnements Stripe et la base. Un webhook manqué ou une panne fournisseur demande une reprise opérationnelle ; aucune tâche planifiée n’a été activée sur vos services.
- Appliquer une limitation au niveau de l’hébergeur/WAF pour les requêtes et tentatives d’authentification. Les limites applicatives partagées protègent les courriels/comptes et les opérations coûteuses ; elles ne remplacent pas une protection réseau contre les attaques distribuées.
- Nettoyer régulièrement les sessions/tokens/compteurs expirés en conservant les documents métier. Voir `scripts/maintenance.sql` (à planifier après revue sur votre infrastructure).
- Le portail expose toutes les lignes du compte dans ses listes et exports. Pour des volumes très importants, ajouter une pagination serveur et des exports asynchrones avant de promettre une charge élevée.

## Information légale et commerciale

Les mentions de conformité automatique et d’hébergement garanti au Canada ont été retirées. Les pages publiques décrivent le fonctionnement, mais leurs textes ne constituent pas une validation juridique. Avant commercialisation, préciser l’identité de l’exploitant, les coordonnées du responsable, les lieux et durées de conservation, les sous-traitants, les modalités commerciales et la gestion des demandes/incidents. Faire examiner ces éléments selon votre situation.

Références :
- [Guide de politique de confidentialité de la CAI](https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_POL_Confidentialite.pdf)
- [Responsable des renseignements personnels](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/responsable-protection-renseignements-personnels-entreprise)
- [Webhooks Stripe](https://docs.stripe.com/webhooks)
- [Domaine Resend de test](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)

## Retour arrière

Les colonnes historiques sont conservées, mais revenir au code précédent réintroduirait les failles de session et de facturation. En cas de problème, placer le service en maintenance, conserver la base et les traces de référence, puis corriger la version renforcée. Ne pas supprimer de migrations appliquées ni restaurer une sauvegarde par-dessus des paiements/documents récents sans rapprochement.
