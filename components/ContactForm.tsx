"use client";
import { useState } from "react";
import Link from "next/link";
export default function ContactForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("Votre message a été envoyé.");
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
      <p className="field-help">
        Votre nom, votre courriel et votre message servent à traiter votre demande.
        Ils sont transmis au support par Resend et peuvent être traités hors Québec.
        Pour connaître les traitements et vos droits, consultez la{" "}
        <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
      </p>
      <label>
        Votre nom
        <input name="name" required maxLength={150} autoComplete="name" />
      </label>
      <label>
        Votre courriel
        <input
          name="email"
          required
          type="email"
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label>
        Comment pouvons-nous vous aider ?
        <textarea name="message" required rows={6} maxLength={5000} />
      </label>
      <button className="button primary" disabled={busy}>
        {busy ? "Envoi…" : "Envoyer mon message →"}
      </button>
      <p className="field-help">
        Le formulaire est réservé aux utilisateurs connectés. N’incluez aucun
        mot de passe ni renseignement bancaire.
      </p>
    </form>
  );
}
