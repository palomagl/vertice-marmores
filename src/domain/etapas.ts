/**
 * As etapas do fluxo guiado do configurador + a lógica de "está pronta?".
 * Fica em domain/ (não em components/) de propósito: é lógica pura sobre o
 * Projeto, sem JSX — assim entra na mesma suíte de testes rápida e isolada
 * de geometry.ts/quote.ts (vitest.config.ts só roda `*.test.ts`, sem
 * ambiente de DOM/React). O componente `EtapaRail` (components/EtapaRail.tsx)
 * só desenha isto.
 */
import { medidasValidas, recorteCabeNoTrecho } from "./geometry";
import type { Projeto } from "./project";

export type EtapaId =
  | "ambiente"
  | "formato"
  | "medidas"
  | "recortes"
  | "acabamentos"
  | "pedra"
  | "revisao";

export const ETAPAS: { id: EtapaId; titulo: string; pergunta: string }[] = [
  { id: "ambiente", titulo: "Ambiente", pergunta: "O que vamos montar?" },
  { id: "formato", titulo: "Formato", pergunta: "Qual é o formato da bancada?" },
  { id: "medidas", titulo: "Medidas", pergunta: "Quais são as medidas?" },
  { id: "recortes", titulo: "Recortes", pergunta: "Precisamos de algum recorte?" },
  { id: "acabamentos", titulo: "Acabamentos", pergunta: "Como será o acabamento?" },
  { id: "pedra", titulo: "Pedra", pergunta: "Qual pedra vamos usar?" },
  { id: "revisao", titulo: "Revisão", pergunta: "Confira seu orçamento" },
];

/**
 * Se a etapa está pronta PELOS DADOS do projeto — não "o vendedor já
 * clicou Continuar nela". A maior parte das etapas é sempre válida por
 * construção (o modelo não permite ambiente/formato/acabamento "quebrado");
 * as que realmente podem falhar são Medidas (trecho com medida ausente),
 * Recortes (algo maior que o espaço onde foi colocado) e Pedra (nenhuma
 * selecionada) — Revisão soma as três.
 */
export function etapaConcluida(id: EtapaId, projeto: Projeto): boolean {
  switch (id) {
    case "ambiente":
      return true;
    case "formato":
      // a store (setFormato) garante o nº de trechos certo pro formato —
      // um array vazio só aconteceria com dado corrompido
      return projeto.bancada.trechos.length > 0;
    case "medidas":
      return medidasValidas(projeto.bancada);
    case "recortes":
      // nenhum recorte é uma configuração válida; só falha se algo não coube
      return projeto.recortes.every((r) => recorteCabeNoTrecho(projeto.bancada, r));
    case "acabamentos":
      // frontão/saia "nenhum" são válidos; acabamento de borda sempre tem tipo
      return true;
    case "pedra":
      return projeto.material != null;
    case "revisao":
      return (
        etapaConcluida("medidas", projeto) &&
        etapaConcluida("recortes", projeto) &&
        etapaConcluida("pedra", projeto)
      );
  }
}

/**
 * Por onde abrir o editor: a primeira etapa ainda não pronta pelos dados,
 * ou "revisao" se está tudo certo — reabrir um projeto já configurado leva
 * direto pra conferência do orçamento, não obriga passar por tudo de novo.
 */
export function primeiraEtapaPendente(projeto: Projeto): EtapaId {
  for (const e of ETAPAS) {
    if (e.id === "revisao") continue;
    if (!etapaConcluida(e.id, projeto)) return e.id;
  }
  return "revisao";
}
