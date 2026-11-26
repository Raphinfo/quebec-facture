export const dynamic = "force-dynamic";
import Brand from "@/components/Brand";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";
export default function Page() {
  const email = process.env.SUPPORT_EMAIL;
  const privacyEmail = process.env.PRIVACY_EMAIL || email;
  return (
    <section className="public-document">
      <Brand />
      <span className="eyebrow" style={{ marginTop: 40 }}>
        PARLONS DE VOTRE ESPACE
      </span>
      <h1>
        Un coup de main,
        <br />
        au bon moment.
      </h1>
      <div className="contact-grid">
        <div>
          <h2>Nous contacter</h2>
          <p>
            Une question sur vos documents, votre compte ou votre abonnement ?
            Décrivez votre demande et le problème rencontré.
          </p>
          {email && (
            <p>
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          )}
          <h2>Vos renseignements personnels</h2>
          <p>
            Les demandes relatives à vos renseignements personnels ne nécessitent
            pas de compte. Consultez les coordonnées du responsable dans la{" "}
            <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
          </p>
          {privacyEmail && (
            <p>
              <a href={`mailto:${privacyEmail}`}>Écrire au responsable de la protection des renseignements personnels</a>
            </p>
          )}
          <p>
            <Link href="/login">Se connecter à mon compte →</Link>
          </p>
          <p className="field-help">
            Pour gérer un paiement ou annuler un abonnement, utilisez le portail
            Stripe depuis votre espace.
          </p>
        </div>
        <div className="panel">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
