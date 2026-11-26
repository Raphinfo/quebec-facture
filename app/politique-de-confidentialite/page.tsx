export const dynamic = "force-dynamic";
import Link from "next/link";
import Brand from "@/components/Brand";
export default function Page() {
  const contact = process.env.PRIVACY_EMAIL || process.env.SUPPORT_EMAIL;
  return (
    <article className="public-document">
      <Brand />
      <h1>Vos données, en toute clarté.</h1>
      <p>
        Cette page décrit les traitements mis en œuvre par Québec Facture pour
        fournir son espace de facturation.
      </p>
      <h2>Les informations utilisées</h2>
      <p>
        Le service utilise votre courriel, un hachage de votre mot de passe, les
        coordonnées de votre entreprise ainsi que les clients, soumissions,
        factures et dépenses que vous saisissez. Ces données servent à gérer
        votre compte, produire vos documents et répondre à vos demandes.
      </p>
      <h2>Les services techniques</h2>
      <p>
        Les données sont enregistrées dans une base PostgreSQL hébergée par
        Neon. Stripe assure la gestion des abonnements ; l’application ne reçoit
        pas vos numéros complets de carte. Resend traite les courriels de
        vérification, de récupération et les documents envoyés. Selon la
        configuration et les sous-traitants, des données peuvent être traitées à
        l’extérieur du Québec.
      </p>
      <h2>Sessions et préférences</h2>
      <p>
        Un témoin de session permet de maintenir votre connexion pendant sept
        jours au maximum. Votre préférence de thème est enregistrée localement
        dans votre navigateur. La déconnexion révoque la session utilisée ; la
        réinitialisation du mot de passe révoque les sessions du compte.
      </p>
      <h2>Documents et demandes</h2>
      <p>
        Les factures émises restent dans l’historique, y compris lorsqu’elles
        sont annulées. Vous pouvez exporter les données du compte depuis votre
        espace. Pour une demande d’accès, de correction ou de suppression,
        contactez le responsable de la protection des renseignements personnels.
        Vous pouvez aussi lui adresser une demande de portabilité ou de retrait
        de votre consentement à une utilisation ou une communication.
        Le retrait peut empêcher la fourniture d’un service qui nécessite ces
        renseignements. Il ne supprime pas les obligations légales de conservation.
        Une demande de suppression doit tenir compte des obligations de
        conservation applicables.
      </p>
      <p>
        Exploitant : {process.env.OPERATOR_NAME || "Québec Facture"} (
        {process.env.OPERATOR_CITY || "Québec, Canada"}).
      </p>
      <p>
        Responsable :{" "}
        {process.env.PRIVACY_OFFICER_TITLE ||
          "Responsable de la protection des renseignements personnels"}
        .
      </p>
      {contact ? (
        <p>
          Contact : <a href={`mailto:${contact}`}>{contact}</a>
        </p>
      ) : (
        <p>
          Les coordonnées du responsable ne sont pas encore renseignées sur ce
          site. Le formulaire de support réservé aux comptes connectés ne
          remplace pas ce canal pour les personnes sans compte.
        </p>
      )}
      <h2>Protéger votre compte</h2>
      <p>
        Utilisez un mot de passe unique et gardez vos liens de récupération
        confidentiels. Signalez rapidement toute activité inhabituelle par le
        canal de support.
      </p>
      <p>
        <Link href="/dashboard">Revenir à mon espace →</Link>
      </p>
    </article>
  );
}
