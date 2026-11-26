import Link from "next/link";
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Québec Facture, accueil">
      <span className="brand-mark" aria-hidden="true">
        q<span>f</span>
      </span>
      <span>
        Québec<span className="brand-light">Facture</span>
      </span>
    </Link>
  );
}
