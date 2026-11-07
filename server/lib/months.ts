const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11" → "novembro/2026" */
export function fmtMonthLabel(referenceMonth: string): string {
  const [y, m] = referenceMonth.split("-").map(Number);
  return `${MONTHS[m - 1] ?? referenceMonth}/${y}`;
}
