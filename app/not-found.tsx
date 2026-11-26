import Link from "next/link";
export default function NotFound() {
  return (
    <section className="public-document">
      <span className="eyebrow">404</span>
      <h1>Cette page a pris un autre chemin.</h1>
      <p>Retrouvez votre espace de facturation ou revenez à l’accueil.</p>
      <Link href="/" className="button primary">
        Retour à l’accueil
      </Link>
    </section>
  );
}
