"use client";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  value: string;
  savedValue: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onReadingChange: (reading: boolean) => void;
};

export default function CompanyLogoUpload({
  value,
  savedValue,
  disabled,
  onChange,
  onReadingChange,
}: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const reader = useRef<FileReader | null>(null);
  const sequence = useRef(0);
  const [selected, setSelected] = useState<{
    value: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dirty = value !== savedValue;

  useEffect(
    () => () => {
      sequence.current++;
      reader.current?.abort();
      onReadingChange(false);
    },
    [onReadingChange],
  );

  async function select(files: FileList | null) {
    if (disabled || !files?.length) return;
    const version = ++sequence.current;
    reader.current?.abort();
    setReading(false);
    onReadingChange(false);
    setError("");
    if (files.length !== 1) {
      setError("Choisissez une seule image pour votre logo.");
      return;
    }
    const file = files[0];
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(
        "Format non pris en charge. Choisissez une image PNG, JPEG ou WebP.",
      );
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Cette image dépasse 2 Mo. Choisissez un fichier plus léger.");
      return;
    }
    if (!file.size) {
      setError("Ce fichier est vide. Choisissez une autre image.");
      return;
    }
    setReading(true);
    onReadingChange(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const current = new FileReader();
        reader.current = current;
        current.onload = () => resolve(String(current.result));
        current.onerror = () =>
          reject(
            new Error(
              "Impossible de lire cette image. Réessayez avec un autre fichier.",
            ),
          );
        current.onabort = () => reject(new Error("Lecture annulée."));
        current.readAsDataURL(file);
      });
      const preview = new Image();
      preview.src = dataUrl;
      try {
        await preview.decode();
      } catch {
        throw new Error(
          "Cette image est illisible ou endommagée. Choisissez un autre fichier.",
        );
      }
      if (version !== sequence.current) return;
      setSelected({ value: dataUrl, name: file.name });
      onChange(dataUrl);
    } catch (cause) {
      if (version === sequence.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de lire cette image.",
        );
    } finally {
      if (version === sequence.current) {
        setReading(false);
        onReadingChange(false);
      }
    }
  }

  function remove() {
    sequence.current++;
    reader.current?.abort();
    setReading(false);
    onReadingChange(false);
    setError("");
    setSelected(null);
    onChange("");
    if (input.current) input.current.value = "";
    chooseButton.current?.focus();
  }

  return (
    <section className="company-logo" aria-labelledby={`${id}-label`}>
      <label id={`${id}-label`} htmlFor={id}>
        Logo de l’entreprise
      </label>
      <div
        className={`logo-import ${dragging ? "is-dragging" : ""} ${error ? "has-error" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void select(event.dataTransfer.files);
        }}
      >
        <input
          ref={input}
          id={id}
          type="file"
          className="sr-only logo-file-input"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help ${id}-status${error ? ` ${id}-error` : ""}`}
          onChange={(event) => {
            void select(event.target.files);
            event.target.value = "";
          }}
        />
        {value ? (
          <div className="logo-preview">
            {/* A data URL must stay unchanged: the same image is stored and printed. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Aperçu du logo de l’entreprise" />
          </div>
        ) : (
          <div className="logo-placeholder" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4" />
              <circle cx="15" cy="8" r="1.5" />
            </svg>
          </div>
        )}
        <div className="logo-details">
          <strong>
            {value
              ? selected?.value === value
                ? selected.name
                : dirty
                  ? "Aperçu du logo sélectionné"
                  : "Logo enregistré"
              : "Ajoutez votre logo"}
          </strong>
          {value && selected?.value !== value && (
            <span className="field-help">
              {dirty
                ? "Le nom du fichier n’est plus disponible."
                : "Le nom d’origine n’est pas conservé."}
            </span>
          )}
          <p id={`${id}-help`} className="field-help">
            PNG, JPEG ou WebP · 2 Mo maximum.
            <span className="logo-drop-help">
              {" "}
              Glissez-déposez une image ici.
            </span>
          </p>
          <div className="logo-actions">
            <button
              ref={chooseButton}
              type="button"
              className="button secondary small-button"
              disabled={disabled}
              onClick={() => input.current?.click()}
            >
              {value ? "Remplacer" : "Choisir une image"}
            </button>
            {value && (
              <button
                type="button"
                className="text-link"
                disabled={disabled}
                onClick={remove}
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>
      <p
        id={`${id}-status`}
        className={`field-help logo-save-status ${value && !dirty ? "is-saved" : ""}`}
        role="status"
      >
        {reading
          ? "Lecture de l’image…"
          : dirty
            ? value
              ? "Aperçu local — enregistrez votre entreprise pour conserver ce logo."
              : "Retrait non enregistré — enregistrez votre entreprise pour le confirmer."
            : value
              ? "✓ Logo enregistré dans votre profil."
              : "Le logo sera enregistré avec le bouton « Enregistrer mon entreprise »."}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="notice error logo-error">
          {error}
        </p>
      )}
    </section>
  );
}
