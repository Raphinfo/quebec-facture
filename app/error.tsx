"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="public-document">
      <span className="eyebrow">UN IMPREVU</span>
      <h1>Nous n’avons pas pu charger cette page.</h1>
      <p>Vos données n’ont pas été effacées. Réessayez dans un instant.</p>
      <button className="button primary" onClick={reset}>
        Réessayer
      </button>
    </section>
  );
}
