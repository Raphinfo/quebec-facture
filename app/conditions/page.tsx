import Link from "next/link";
import Brand from "@/components/Brand";
export default function Page() {
  return (
    <article className="public-document">
      <Brand />
      <h1>Conditions d’utilisation</h1>
      <p>
        Québec Facture fournit un outil de préparation de soumissions,
        d’émission de factures et de suivi des dépenses. Vous restez responsable
        de l’exactitude des informations et de la configuration fiscale de votre
        entreprise.
      </p>
      <h2>Votre compte</h2>
      <p>
        Utilisez une adresse courriel qui vous appartient et protégez vos accès.
        Vous devez être autorisé à enregistrer les renseignements de vos
        clients. L’envoi de messages non sollicités, les tentatives d’accès aux
        comptes d’autrui et l’utilisation frauduleuse du service sont interdits.
      </p>
      <h2>Forfaits et paiements</h2>
      <p>
        Le forfait gratuit permet d’émettre trois factures au total.
        L’annulation d’une facture ne rétablit pas le quota. Le forfait
        Professionnel est présenté à 15 $ CA par mois et permet d’émettre des
        factures sans limite pendant la période active de l’abonnement. Les
        montants finaux et les éventuelles taxes sont affichés par Stripe avant
        la confirmation du paiement.
      </p>
      <p>
        Un essai de trois jours peut être proposé une fois par compte, avec
        carte bancaire. À son terme, l’abonnement se renouvelle automatiquement
        sauf annulation préalable. Vous pouvez gérer les modalités et
        l’annulation dans le portail de facturation accessible depuis votre
        espace. Pour une question relative à un remboursement, contactez le
        support.
      </p>
      <h2>Vos documents</h2>
      <p>
        Vérifiez chaque document avant son émission ou son envoi. Les factures
        émises sont conservées et les soumissions envoyées sont figées.
        L’application n’effectue pas de déclaration fiscale et ne remplace pas
        l’avis d’un professionnel. Les statuts de paiement des factures clients
        sont renseignés manuellement par vos soins.
      </p>
      <h2>Disponibilité et récupération</h2>
      <p>
        Des interruptions peuvent survenir. Vous pouvez exporter une copie de
        vos données et conserver les documents nécessaires à votre activité.
        Pour signaler un problème, utilisez le canal de support.
      </p>
      <h2>Exploitant et droit applicable</h2>
      <p>
        Le service Québec Facture est exploité par{" "}
        {process.env.OPERATOR_NAME || "Québec Facture"}{" "}
        ({process.env.OPERATOR_CITY || "Québec, Canada"}). Les présentes
        conditions sont régies par les lois applicables au Québec et au Canada.
      </p>
      <p>
        <Link href="/contact">Contacter le support</Link> ·{" "}
        <Link href="/politique-de-confidentialite">
          Politique de confidentialité
        </Link>
      </p>
    </article>
  );
}
