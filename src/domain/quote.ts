/**
 * Cálculo do orçamento (especificação, seção 9).
 *
 * Bancada NÃO é área × R$/m². A chapa vem em tamanho fixo e o retalho se perde.
 * v1: retângulo envolvente (conservador e defensável). Nesting fica pra fase 2.
 */
import {
  areaPoligono,
  bbox,
  bordaAcabadaMm,
  contornoBancada,
} from "./geometry";
import { PRESETS } from "./presets";
import type { Projeto } from "./project";
import type { TabelaPrecos } from "./tabelaPrecos";
import { mm2ParaM2 } from "./units";

export interface ItemOrcamento {
  chave: string;
  descricao: string;
  detalhe: string;
  valor: number;
}

export interface Orcamento {
  itens: ItemOrcamento[];
  /** soma dos itens antes de desconto */
  subtotal: number;
  total: number;
  // --- números que NÃO vão para a proposta do cliente (modo apresentação esconde) ---
  interno: {
    areaEnvolventeM2: number;
    areaRealM2: number;
    aproveitamentoPct: number;
    custoMaterial: number | null;
    margemPct: number | null;
  };
}

const arred = (v: number): number => Math.round(v * 100) / 100;

export function calcularOrcamento(
  projeto: Projeto,
  tabela: TabelaPrecos,
  opts?: { distanciaKm?: number },
): Orcamento {
  const { pontos, segmentos } = contornoBancada(projeto.bancada);
  const caixa = bbox(pontos);
  const preset = PRESETS[projeto.ambiente];

  const areaEnvolventeMm2 = caixa.largura * caixa.altura;
  const areaRealMm2 = areaPoligono(pontos);
  const areaEnvolventeM2 = mm2ParaM2(areaEnvolventeMm2) * tabela.fatorAproveitamento;
  const areaRealM2 = mm2ParaM2(areaRealMm2);

  const itens: ItemOrcamento[] = [];

  // 1. m² de chapa consumida × preço/m²
  if (projeto.material) {
    const valor = arred(areaEnvolventeM2 * projeto.material.precoM2);
    itens.push({
      chave: "chapa",
      descricao: `Bancada — ${projeto.material.nome}`,
      detalhe: `${areaEnvolventeM2.toFixed(2)} m² (retângulo ${(
        caixa.largura / 1000
      ).toFixed(2)} × ${(caixa.altura / 1000).toFixed(2)} m)`,
      valor,
    });
  }

  // 2. metro linear de borda acabada × preço do acabamento
  const bordaMm = bordaAcabadaMm(segmentos, preset.todasBordasAcabadas);
  const bordaM = bordaMm / 1000;
  const precoBorda = tabela.acabamentoBorda[projeto.acabamentoBorda.tipo];
  if (bordaM > 0 && precoBorda > 0) {
    itens.push({
      chave: "acabamento",
      descricao: `Acabamento de borda — ${projeto.acabamentoBorda.tipo.replace("_", " ")}`,
      detalhe: `${bordaM.toFixed(2)} m linear`,
      valor: arred(bordaM * precoBorda),
    });
  }

  // 3 + 4. recortes (valor fixo por peça; área molhada = cuba esculpida)
  for (const r of projeto.recortes) {
    const preco = tabela.recorte[r.tipo] ?? 0;
    if (preco <= 0) continue;
    itens.push({
      chave: `recorte_${r.id}`,
      descricao: rotuloRecorte(r.tipo),
      detalhe: r.diametro
        ? `Ø ${r.diametro} mm`
        : `${Math.round(r.largura / 10)} × ${Math.round(r.profundidade / 10)} cm`,
      valor: arred(preco),
    });
  }

  // 5. complementos (frontão, saia, rodabanca...) — R$/m linear × comprimento dos trechos
  for (const c of projeto.complementos) {
    const precoM = tabela.complemento[c.tipo] ?? 0;
    if (precoM <= 0) continue;
    const compMm = c.trechos.reduce(
      (acc, ti) => acc + (projeto.bancada.trechos[ti]?.comprimento ?? 0),
      0,
    );
    const compM = compMm / 1000;
    if (compM <= 0) continue;
    itens.push({
      chave: `complemento_${c.id}`,
      descricao: rotuloComplemento(c.tipo),
      detalhe: `${compM.toFixed(2)} m · altura ${Math.round(c.altura / 10)} cm`,
      valor: arred(compM * precoM),
    });
  }

  // 6. instalação
  const inst = tabela.instalacao.fixo + tabela.instalacao.porM2 * areaRealM2;
  if (inst > 0) {
    itens.push({
      chave: "instalacao",
      descricao: "Instalação",
      detalhe: tabela.instalacao.porM2 > 0 ? `fixo + ${areaRealM2.toFixed(2)} m²` : "fixo",
      valor: arred(inst),
    });
  }

  // 7. frete por faixa
  const distanciaKm = opts?.distanciaKm;
  if (distanciaKm != null) {
    const faixa =
      tabela.frete.find((f) => distanciaKm <= f.ateKm) ??
      tabela.frete[tabela.frete.length - 1];
    if (faixa) {
      itens.push({
        chave: "frete",
        descricao: "Frete",
        detalhe: `até ${faixa.ateKm} km`,
        valor: arred(faixa.valor),
      });
    }
  }

  const subtotal = arred(itens.reduce((acc, i) => acc + i.valor, 0));

  const custoMaterial = projeto.material?.custoM2
    ? arred(areaEnvolventeM2 * projeto.material.custoM2)
    : null;
  const margemPct =
    custoMaterial != null && subtotal > 0
      ? arred(((subtotal - custoMaterial) / subtotal) * 100)
      : null;

  return {
    itens,
    subtotal,
    total: subtotal,
    interno: {
      areaEnvolventeM2: arred(areaEnvolventeM2),
      areaRealM2: arred(areaRealM2),
      aproveitamentoPct:
        areaEnvolventeM2 > 0 ? arred((areaRealM2 / areaEnvolventeM2) * 100) : 0,
      custoMaterial,
      margemPct,
    },
  };
}

function rotuloRecorte(t: string): string {
  const m: Record<string, string> = {
    area_molhada: "Área molhada (cuba esculpida)",
    cuba_embutir: "Recorte — cuba de embutir",
    cuba_sobrepor: "Recorte — cuba de sobrepor",
    cooktop: "Recorte — cooktop",
    furo_torneira: "Furo de torneira",
    furo_dosador: "Furo de dosador",
  };
  return m[t] ?? t;
}

function rotuloComplemento(t: string): string {
  const m: Record<string, string> = {
    frontao: "Frontão",
    saia: "Saia",
    rodabanca: "Rodabanca",
    soleira: "Soleira",
    pingadeira: "Pingadeira",
  };
  return m[t] ?? t;
}
