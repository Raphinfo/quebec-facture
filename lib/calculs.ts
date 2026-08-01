
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

/**
 * Calcule les montants d'une facture ligne par ligne selon les règles fiscales du Québec.
 */
export function calculerFacture(items: FactureItem[]): ResultatCalcul {
  let sousTotal = 0;
  let totalTPS = 0;
  let totalTVQ = 0;

  items.forEach((item) => {
    const montantLigne = item.price * item.quantity;
    sousTotal += montantLigne;

    if (item.isTpsApplicable) {
      // TPS au Québec : 5%
      totalTPS += montantLigne * 0.05;
    }

    if (item.isTvqApplicable) {
      // TVQ au Québec : 9.975%
      totalTVQ += montantLigne * 0.09975;
    }
  });

  // Gestion des arrondis à 2 décimales pour éviter les surprises en JavaScript (ex: 10.000000004)
  return {
    sousTotal: Math.round(sousTotal * 100) / 100,
    totalTPS: Math.round(totalTPS * 100) / 100,
    totalTVQ: Math.round(totalTVQ * 100) / 100,
    totalGlobal: Math.round((sousTotal + totalTPS + totalTVQ) * 100) / 100,
  };
}