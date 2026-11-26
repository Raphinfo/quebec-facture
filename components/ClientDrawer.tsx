"use client";
import { useEffect, useRef, useState } from "react";

export type CreatedClient = {
  id: number;
  name: string;
  company: string;
  email: string;
  address?: string;
  neq?: string;
  phone?: string;
};

type Props = {
  open: boolean;
  client?: CreatedClient | null;
  onClose: () => void;
  onCreated: (client: CreatedClient, mode: "create" | "edit") => void;
};

export default function ClientDrawer({
  open,
  client,
  onClose,
  onCreated,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(client?.id);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    firstField.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        isEditing ? `/api/clients/${client!.id}` : "/api/clients",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.fromEntries(new FormData(event.currentTarget)),
          ),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Impossible d’enregistrer ce client.");
      if (!Number.isInteger(result.client?.id))
        throw new Error(
          "Le client a été enregistré, mais sa sélection a échoué. Rechargez la liste avant de réessayer.",
        );
      onCreated(result.client, isEditing ? "edit" : "create");
      form.current?.reset();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer ce client.",
      );
      requestAnimationFrame(() => errorMessage.current?.focus());
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function close() {
    if (submitting.current) return;
    setError("");
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="client-drawer"
      aria-labelledby="new-client-title"
      aria-describedby="new-client-help"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        const active = document.activeElement;
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (active === first || !controls.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (active === last || !controls.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="drawer-header">
        <div>
          <h2 id="new-client-title">
            {isEditing ? "Modifier le client" : "Nouveau client"}
          </h2>
          <p id="new-client-help">
            {isEditing
              ? "Les documents déjà émis conservent leurs informations d’origine."
              : "Il sera sélectionné dans votre facture après l’enregistrement."}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Fermer le panneau client"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </header>
      <form
        key={client?.id ?? "new"}
        ref={form}
        className="form-stack drawer-form"
        onSubmit={submit}
        aria-busy={busy}
      >
        {error && (
          <p
            ref={errorMessage}
            role="alert"
            tabIndex={-1}
            className="notice error"
          >
            {error}
          </p>
        )}
        <label>
          Nom du client
          <input
            ref={firstField}
            name="name"
            required
            maxLength={200}
            autoComplete="name"
            defaultValue={client?.name || ""}
          />
        </label>
        <label>
          Entreprise (facultatif)
          <input
            name="company"
            maxLength={200}
            autoComplete="organization"
            defaultValue={client?.company || ""}
          />
        </label>
        <label>
          Courriel
          <input
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            defaultValue={client?.email || ""}
          />
        </label>
        <label>
          Adresse
          <input
            name="address"
            maxLength={500}
            autoComplete="street-address"
            defaultValue={client?.address || ""}
          />
        </label>
        <div className="two-fields">
          <label>
            NEQ (facultatif)
            <input name="neq" maxLength={20} defaultValue={client?.neq || ""} />
          </label>
          <label>
            Téléphone
            <input
              name="phone"
              type="tel"
              maxLength={40}
              autoComplete="tel"
              defaultValue={client?.phone || ""}
            />
          </label>
        </div>
        <footer className="drawer-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={close}
          >
            Annuler
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Enregistrement…"
              : isEditing
                ? "Enregistrer les modifications"
                : "Ajouter le client"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
