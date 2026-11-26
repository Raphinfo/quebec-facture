import { calculateDocument } from "./money";
export interface FactureItem {
  description: string;
  quantity: number;
  price: number;
  isTpsApplicable: boolean;
  isTvqApplicable: boolean;
}
export interface ResultatCalcul {
  sousTotal: number;
  totalTPS: number;
  totalTVQ: number;
  totalGlobal: number;
}
export function calculerFacture(items: FactureItem[]): ResultatCalcul {
  const result = calculateDocument(
    items.map((item) => ({ ...item, unitPrice: item.price })),
  );
  return {
    sousTotal: result.amountSubtotal,
    totalTPS: result.tpsAmount,
    totalTVQ: result.tvqAmount,
    totalGlobal: result.amountTotal,
  };
}
