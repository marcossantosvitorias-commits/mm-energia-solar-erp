export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const SEASONAL_FACTORS = [1.08, 1.02, 1.00, 0.91, 0.82, 0.76, 0.80, 0.91, 0.99, 1.08, 1.13, 1.10];

export function buildMonthlyGeneration(monthlyAverage = 0) {
  const average = Math.max(0, Number(monthlyAverage) || 0);
  const factorAverage = SEASONAL_FACTORS.reduce((sum, value) => sum + value, 0) / 12;
  return MONTHS.map((month, index) => ({
    month,
    generation: Number((average * (SEASONAL_FACTORS[index] / factorAverage)).toFixed(1)),
  }));
}
