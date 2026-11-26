# Identité visuelle

La palette est centralisée dans `app/globals.css` pour les pages publiques et l’espace de travail. Le thème clair associe un fond gris neutre `#f4f5f7`, des surfaces blanches, du texte anthracite `#252a34` et un bleu profond `#204b85`. Le thème sombre utilise des surfaces anthracite et un bleu éclairci pour préserver le contraste.

Les composants partagés utilisent ces variables : `--primary` et `--on-primary` pour les actions, `--accent-soft` pour la navigation sélectionnée, `--field-border` pour les champs, `--focus` pour le clavier. Les couleurs sémantiques de succès, d’avertissement et d’erreur sont conservées. Le modèle d’impression utilise la même palette claire, indépendamment du thème de l’écran.

Les petits textes ont été agrandis, les titres renforcés et les espacements de formulaire harmonisés. Les formulaires passent en une colonne sur tablette et mobile. Les tableaux et la navigation peuvent défiler horizontalement dans leur propre zone.

## Validation du 12 novembre 2026

- TypeScript, ESLint et `git diff --check` : réussis.
- Chrome automatisé : dix pages publiques sur ordinateur ; accueil, inscription, forfaits et contact également à 390 pixels.
- Copie isolée avec API simulées : cinq onglets du tableau de bord à 320, 390, 768 et 1 440 pixels, thèmes clair et sombre, sans débordement horizontal de page. Création d’une facture avec données fictives réussie.
- Contrastes calculés sur les variables : texte secondaire sur surface au moins 5,91:1 ; texte de bouton principal au moins 8,72:1 ; bordure de champ au moins 3,64:1. Principales associations de texte contrôlées au seuil 4,5:1, bordures et focus au seuil 3:1.
- Focus clavier visible de 3 pixels vérifié dans Chrome. Captures de l’accueil et du tableau de bord inspectées.

Ces contrôles visuels ne constituent pas un audit exhaustif d’accessibilité. Aucune donnée réelle n’a été créée par la prévisualisation.

## Disposition du tableau de bord — seconde passe

La navigation utilise désormais une surface prune anthracite `#292634`, du texte clair, une sélection `#403b4e` et un repère prune pâle. Les cinq icônes sont des SVG au même trait, sans dépendance ajoutée. Le bleu reste réservé aux actions principales, liens et focus dans l’espace de travail. Les titres secondaires, bordures, avatars et bandeaux utilisent des couleurs neutres. Les montants encaissés sont verts et les sommes en attente ambre, toujours accompagnés de libellés ; les erreurs, échéances expirées et paiements à régulariser sont rouges.

La soumission est organisée en groupes sémantiques : client et validité, prestations, notes, récapitulatif. Description, quantité, prix, taxes et retrait sont alignés sur ordinateur puis réorganisés sur mobile. Le récapitulatif expose les montants du moteur existant et rapproche le total du bouton d’enregistrement. La facture conserve son modèle de montant par prestation ; aucune quantité, note ou échéance supplémentaire n’a été ajoutée à ses données. Le formulaire client, les indicateurs et les bandeaux sont plus compacts.

Validation : TypeScript, ESLint, 16 tests métier/session et contrôle du diff réussis. Dans Chrome avec API simulées : cinq onglets à 320, 390, 768 et 1 440 pixels, en clair et sombre, sans débordement de page ; création de facture, ajout/retrait de prestations, activation/désactivation de TPS, montant calculé et contenu transmis à l’enregistrement d’une soumission vérifiés. Les textes de navigation dépassent 9:1 ; les couleurs sémantiques sur carte claire dépassent 6:1 ; les contours de champs dépassent 3:1. Captures de soumission ordinateur/mobile inspectées.

Le fichier `lib/print.ts` n’a pas été modifié pendant cette seconde passe (empreinte SHA-256 avant/après identique). Aucun paiement, courriel réel ou test sur imprimante physique n’a été exécuté. Les tests simulés de l’interface ne remplacent pas une validation de bout en bout des services externes ni un audit exhaustif avec lecteur d’écran.

## Panneau client et finalisation du compte

Le formulaire permanent de client est remplacé par « + Nouveau client » à côté du destinataire. `ClientDrawer` utilise un dialogue modal natif avec boucle Tab/Maj+Tab, focus initial sur le nom, fermeture par Échap ou boutons, restitution du focus au déclencheur et blocage de la fermeture pendant l’enregistrement. Le mobile utilise la hauteur disponible de l’écran. Les six champs et leurs limites sont conservés ; les erreurs serveur sont annoncées et reçoivent le focus, sans vider les champs.

`POST /api/clients` renvoie désormais `{ message, client }`, avec l’identifiant et les données retournés par l’insertion. La facture sélectionne cet identifiant sans rechercher par nom, sans rechargement global et sans réinitialiser les prestations ni les taxes. Le carnet de clients et sa suppression existante restent accessibles dans une section repliable.

« Finaliser votre compte » rassemble l’entreprise et la confirmation du courriel. L’état entreprise dépend d’un chargement ou d’une sauvegarde réussie, jamais du brouillon saisi. L’envoi d’un lien ne valide pas le courriel ; le retour dans l’onglet rafraîchit son état enregistré sans remplacer le formulaire d’entreprise en cours. L’encart disparaît lorsque les deux étapes sont terminées.

Le formulaire de facture est rééquilibré avec un récapitulatif adjacent sur grand écran, puis empilé sur mobile. Les notes restent celles des soumissions : aucun champ non enregistré n’a été ajouté aux factures. Les bordures de cartes sont allégées ; les champs gardent un contour neutre, le focus bleu de 3 pixels et un état invalide rouge de 2 pixels avec validation native.

Validation : 19 tests réussis, TypeScript, ESLint et contrôle du diff. Trois nouveaux tests couvrent la réponse client, les entrées invalides et la session obligatoire. Chrome avec API simulées vérifie création et sélection par identifiant malgré un nom identique, champs conservés en cas d’échec, fermeture/réouverture sans perte de facture, clavier dans les deux sens, restitution du focus, taxes et émission de facture, quatre états du compte, sauvegarde refusée et confirmation dans un autre onglet. Modes clair/sombre à 320, 390, 768 et 1 440 pixels, sans débordement de page ni du panneau ; captures ordinateur et mobile inspectées. Modèle d’impression inchangé (même SHA-256).

Limites : interactions de création/enregistrement vérifiées avec API simulées, pas d’écriture de test en production. Aucun envoi réel de courriel, paiement, test d’imprimante physique ou audit complet avec lecteur d’écran effectué.

## Importation du logo de l’entreprise

`CompanyLogoUpload` remplace l’apparence native du champ fichier par une zone compacte : bouton de sélection, dépôt d’une image, aperçu sur damier neutre avec `object-fit: contain`, nom local, remplacement et retrait. Le champ fichier réel reste associé à son libellé, accessible au clavier et annoncé avec ses instructions et erreurs. Les messages sont en français.

Les formats proposés correspondent à la validation existante : PNG, JPEG, WebP, 2 Mo maximum (2 × 1 024 × 1 024 octets). Les images vides ou indécodables sont également refusées côté interface ; une erreur conserve le logo précédent. Le mécanisme FileReader → URL de données → profil enregistré est inchangé, ainsi que la validation serveur et l’impression. Une lecture en cours désactive la sauvegarde pour éviter d’enregistrer l’ancien logo par inadvertance.

La valeur enregistrée est suivie séparément de la sélection locale. Aperçu et retrait restent signalés comme non enregistrés jusqu’au succès de « Enregistrer mon entreprise ». Une erreur de sauvegarde ne valide pas l’aperçu. Le nom du fichier est affiché après sélection mais n’est pas ajouté au schéma de stockage : après rechargement, l’interface signale que le nom d’origine n’est pas conservé.

Vérifications Chrome avec API simulée : sélection par le sélecteur natif déclenché au clavier, trois formats, remplacement, glisser-déposer, refus des formats non pris en charge, dépassement de taille, fichier vide/corrompu et dépôt multiple ; conservation du logo valide en cas d’erreur ; sauvegarde refusée/réussie ; logo conservé après rechargement ; retrait local annulé par rechargement puis retrait enregistré. Focus visible et absence de débordement vérifiés en clair/sombre à 320, 390, 768 et 1 440 pixels. Captures ordinateur/mobile inspectées. Les 19 tests existants passent ; TypeScript, ESLint et contrôle du diff également.

Limites : aucune modification de logo dans la base réelle et aucun test sur téléphone ou imprimante physique. La persistance a été exercée avec une API simulée ; le stockage serveur existant n’a pas été modifié.
