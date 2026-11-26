import { InputError, text } from "./validation";
export type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  total: number;
  isTpsApplicable: boolean;
  isTvqApplicable: boolean;
};
function units(value: unknown, places: number, label: string): bigint {
  if (typeof value !== "string" && typeof value !== "number")
    throw new InputError(`${label} invalide.`);
  const raw = String(value).trim();
  if (!new RegExp(`^\\d{1,8}(?:\\.\\d{1,${places}})?$`).test(raw))
    throw new InputError(`${label} invalide (maximum ${places} décimales).`);
  const [whole, fraction = ""] = raw.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0"))
  );
}
export function calculateDocument(
  raw: unknown,
  taxes = { tps: true, tvq: true },
) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100)
    throw new InputError("Un document doit contenir de 1 à 100 lignes.");
  let subtotal = 0n,
    tps = 0n,
    tvq = 0n;
  const items: Line[] = raw.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new InputError("Ligne invalide.");
    const item = value as Record<string, unknown>;
    const description = text(item.description, "Description", 1000, true);
    const quantity = units(item.quantity ?? 1, 3, "Quantité");
    const price = units(item.unitPrice ?? item.amount, 2, "Prix");
    if (quantity <= 0n || quantity > 1000000000n)
      throw new InputError("Quantité invalide.");
    for (const key of ["isTpsApplicable", "isTvqApplicable"])
      if (item[key] !== undefined && typeof item[key] !== "boolean")
        throw new InputError("Taxe invalide.");
    const amount = (quantity * price + 500n) / 1000n;
    const isTpsApplicable = taxes.tps && item.isTpsApplicable !== false;
    const isTvqApplicable = taxes.tvq && item.isTvqApplicable !== false;
    subtotal += amount;
    if (isTpsApplicable) tps += amount;
    if (isTvqApplicable) tvq += amount;
    return {
      description,
      quantity: Number(quantity) / 1000,
      unitPrice: Number(price) / 100,
      amount: Number(amount) / 100,
      total: Number(amount) / 100,
      isTpsApplicable,
      isTvqApplicable,
    };
  });
  tps = (tps * 500n + 5000n) / 10000n;
  tvq = (tvq * 9975n + 50000n) / 100000n;
  const total = subtotal + tps + tvq;
  if (subtotal <= 0n || total > 9999999999n)
    throw new InputError(
      "Le total doit être positif et inférieur à 100 millions de dollars.",
    );
  return {
    items,
    amountSubtotal: Number(subtotal) / 100,
    tpsAmount: Number(tps) / 100,
    tvqAmount: Number(tvq) / 100,
    amountTotal: Number(total) / 100,
  };
}
export function hasProAccess(plan: string, status: string) {
  return plan === "PRO" && ["ACTIVE", "TRIALING"].includes(status);
}
