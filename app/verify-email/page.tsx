"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
function Verify() {
  const params = useSearchParams(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.get("token") }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vérification impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="public-document">
      <span className="eyebrow">VOTRE COMPTE</span>
      <h1>Confirmez votre adresse courriel.</h1>
      <p>
        Cette étape permet de vérifier que cette adresse vous appartient avant
        l’envoi de documents.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message ? (
        <p role="status" className="notice success">
          {message}
        </p>
      ) : (
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void verify()}
        >
          {busy ? "Vérification…" : "Confirmer mon adresse"}
        </button>
      )}
      <p>
        <Link href="/dashboard">Revenir à mon espace →</Link>
      </p>
    </section>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Verify />
    </Suspense>
  );
}
