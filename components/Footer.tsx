import Link from "next/link";
import Brand from "./Brand";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Brand />
        <p>La facturation simple pour les travailleurs autonomes et PME du Québec.</p>
      </div>
      <nav aria-label="Informations">
        <Link href="/calculateur-tps-tvq">Calculateur TPS/TVQ</Link>
        <Link href="/conditions">Conditions</Link>
        <Link href="/politique-de-confidentialite">Confidentialité</Link>
        <Link href="/contact">Nous contacter</Link>
      </nav>
      <small>© {new Date().getFullYear()} Québec Facture</small>
    </footer>
  );
}
