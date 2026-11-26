"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Brand from "./Brand";
type Mode = "login" | "register" | "forgot" | "reset";
function Form({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const title = {
    login: "Heureux de vous retrouver.",
    register: "Votre prochaine facture commence ici.",
    forgot: "Retrouvez votre accès.",
    reset: "Un nouveau départ.",
  }[mode];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const endpoint = {
        login: "login",
        register: "register",
        forgot: "forgot-password",
        reset: "reset-password",
      }[mode];
      const res = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token: params.get("token") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de continuer.");
      if (mode === "login" || mode === "register")
        router.replace(mode === "register" ? "/choose-plan" : "/dashboard");
      else setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">Votre entreprise. Votre rythme.</span>
          <h1>
            Moins de paperasse.
            <br />
            Plus de place
            <br />
            <em>pour votre métier.</em>
          </h1>
          <p>
            Clients, soumissions et factures réunis dans un espace pensé pour
            votre quotidien.
          </p>
        </div>
        <span className="small">
          Pensé au Québec · Montants en dollars canadiens
        </span>
      </aside>
      <section className="auth-panel">
        <Link href="/" className="text-link">
          ← Retour à l’accueil
        </Link>
        <div className="auth-card">
          <span className="eyebrow">QUÉBEC FACTURE</span>
          <h2>{title}</h2>
          <p className="muted">
            {mode === "register"
              ? "Créez votre compte et émettez vos trois premières factures gratuitement."
              : mode === "login"
                ? "Connectez-vous à votre espace de travail."
                : "Nous vous accompagnons pour récupérer votre compte."}
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice success" role="status">
              {message} <Link href="/login">Se connecter</Link>
            </div>
          )}
          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <p className="field-help">
                Votre courriel et votre mot de passe servent à créer et sécuriser
                votre compte. Le mot de passe est conservé sous forme hachée.
                Des prestataires techniques traitent ces renseignements, notamment
                à l’extérieur du Québec. Consultez les destinataires et les moyens
                d’exercer vos droits dans la{" "}
                <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
              </p>
            )}
            {mode !== "reset" && (
              <label>
                Adresse courriel
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Mot de passe
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "login" ? 1 : 12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode !== "login" && (
                  <span className="field-help">
                    Au moins 12 caractères. Utilisez une phrase facile à
                    retenir.
                  </span>
                )}
              </label>
            )}
            {mode === "register" && (
              <label className="checkbox-label">
                <input type="checkbox" required />
                J’ai lu les <Link href="/conditions">conditions</Link> et la{" "}
                <Link href="/politique-de-confidentialite">
                  politique de confidentialité
                </Link>
                .
              </label>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Un instant…"
                : {
                    login: "Se connecter →",
                    register: "Créer mon compte →",
                    forgot: "Recevoir un lien",
                    reset: "Enregistrer le mot de passe",
                  }[mode]}
            </button>
          </form>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
                <p>
                  Pas encore de compte ?{" "}
                  <Link href="/register">Commencer gratuitement</Link>
                </p>
              </>
            ) : (
              <Link href="/login">Vous avez déjà un compte ? Se connecter</Link>
            )}
          </div>
        </div>
        <span className="small muted">
          Un espace pour garder votre administration en ordre.
        </span>
      </section>
    </div>
  );
}
export default function AuthForm({ mode }: { mode: Mode }) {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <Form mode={mode} />
    </Suspense>
  );
}
