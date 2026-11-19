/**
 * Regras compartilhadas pelos documentos impressos (proposta e ordem de
 * serviço). Duas coisas que não podem vazar para o papel:
 *
 *  1. Placeholder. Um CNPJ "0" ou um telefone em branco não podem virar
 *     "CNPJ 0" na folha que o cliente leva embora. Campo sem valor útil
 *     some inteiro — rótulo junto.
 *
 *  2. Simulação. Projeto sem cliente é o vendedor brincando no balcão.
 *     Não pode consumir número sequencial da empresa nem parecer um
 *     documento válido — ainda mais a OS, que vira pedra cortada.
 */
import type { Projeto } from "./project";

/**
 * Devolve o texto se ele disser alguma coisa, ou undefined.
 *
 * Descarta vazio, só espaço, e qualquer valor que seja só zeros depois de
 * tirar a pontuação — pega "0", "000", "00.000.000/0000-00" e
 * "(00) 00000-0000", que é como placeholder costuma chegar.
 */
export function textoUtil(valor?: string | null): string | undefined {
  const texto = (valor ?? "").trim();
  if (!texto) return undefined;

  const semPontuacao = texto.replace(/[\s.\-/()+]/g, "");
  if (!semPontuacao) return undefined;
  if (/^0+$/.test(semPontuacao)) return undefined;

  if (["-", "—", "n/a", "na", "não informado", "nao informado"].includes(texto.toLowerCase())) {
    return undefined;
  }
  return texto;
}

/** Junta só as partes que têm valor útil. Vazio -> undefined. */
export function linhaDeContato(
  partes: Array<string | undefined | null>,
  separador = " · ",
): string | undefined {
  const uteis = partes.map(textoUtil).filter((p): p is string => p != null);
  return uteis.length ? uteis.join(separador) : undefined;
}

/**
 * Projeto sem nome de cliente é simulação: o vendedor mostrando
 * possibilidades sem ninguém do outro lado.
 */
export function ehSimulacao(projeto: Projeto): boolean {
  return textoUtil(projeto.cliente?.nome) == null;
}

/**
 * A proposta só consome número sequencial quando é proposta de verdade:
 * tem pedra escolhida (senão não há produto) e tem cliente (senão é
 * simulação, e queimar número furaria a contagem da empresa).
 */
export function podeNumerar(projeto: Projeto, orcamentoCompleto: boolean): boolean {
  return orcamentoCompleto && !ehSimulacao(projeto);
}
