/**
 * Regra de ouro da especificação (seção 3):
 * TUDO no modelo é milímetro inteiro. Converte só na entrada e na saída.
 * Estas funções são o único lugar onde a conversão acontece.
 */

/** mm inteiro -> centímetro (número, para exibir). Ex: 2200 -> 220 */
export const mmParaCm = (mm: number): number => mm / 10;

/** centímetro digitado pelo vendedor -> mm inteiro. Ex: 220 -> 2200 */
export const cmParaMm = (cm: number): number => Math.round(cm * 10);

/** mm -> metros com 2 casas, string. Ex: 2200 -> "2,20" */
export const mmParaMetrosLabel = (mm: number): string =>
  (mm / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** mm -> "220 cm" para cotas do desenho */
export const mmParaCmLabel = (mm: number): string =>
  `${Math.round(mm / 10)} cm`;

/** área em mm² -> m² (número) */
export const mm2ParaM2 = (mm2: number): number => mm2 / 1_000_000;

/** R$ com formatação brasileira */
export const brl = (valor: number): string =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** m² com 2 casas para exibição */
export const m2Label = (m2: number): string =>
  `${m2.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
