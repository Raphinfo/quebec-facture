export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  name: string,
  max = 200,
  required = false,
): string {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw new InputError(`${name} invalide.`);
  const result = value.trim();
  if (result.length > max || (required && !result))
    throw new InputError(`${name} : valeur manquante ou trop longue.`);
  return result;
}
export function emailAddress(value: unknown): string {
  const email = text(value, "Courriel", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new InputError("Adresse courriel invalide.");
  return email;
}
export function passwordValue(value: unknown, registration = false): string {
  if (
    typeof value !== "string" ||
    !value ||
    new TextEncoder().encode(value).length > 72 ||
    (registration && value.length < 12)
  ) {
    throw new InputError(
      "Mot de passe requis : au moins 12 caractères à la création, au plus 72 octets.",
    );
  }
  return value;
}
export function clientIdValue(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number")
    throw new InputError("Client invalide.");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1)
    throw new InputError("Client invalide.");
  return id;
}
export function dateValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new InputError("Date invalide.");
  return value;
}
export function safeLogo(value: unknown): string {
  const url = text(value, "Logo", 2_800_000);
  if (!url) return "";
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url))
    throw new InputError(
      "Téléversez un logo PNG, JPEG ou WebP (2 Mo maximum).",
    );
  return url;
}
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
}

export function validUntilValue(value: unknown): string | null {
  const date = dateValue(value);
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
  });
  if (date && date < today)
    throw new InputError(
      "La date de validité ne peut pas être antérieure à aujourd’hui.",
    );
  return date;
}
