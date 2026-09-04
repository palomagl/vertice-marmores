/**
 * Cálculo do orçamento (especificação, seção 9).
 *
 * Bancada NÃO é área × R$/m². A chapa vem em tamanho fixo e o retalho se perde.
 * v1: retângulo envolvente (conservador e defensável). Nesting fica pra fase 2.
 *
 * Regras de apresentação:
 *  - Sem pedra selecionada: `completo === false` e `total === null`. As linhas de
 *    mão de obra continuam em `itensParciais` (o vendedor pode querer vê-las),
 *    mas NÃO existe "total da peça".
 *  - Distância de entrega não informada (`projeto.distanciaKm` ausente):
 *    `fretePendente === true`, linha de frete com `valor: null` ("a combinar"),
 *    fora do total. `distanciaKm === 0` é retirada na loja: frete R$ 0, no total.
 */
import {
  areaPoligono,
  bbox,
  bordaAcabadaMm,
  contornoBancada,
  segmentosDoComplemento,
} from "./geometry";
import { PRESETS } from "./presets";
import type { Projeto } from "./project";
import type { TabelaPrecos } from "./tabelaPrecos";
import { brl, mm2ParaM2 } from "./units";

export interface ItemOrcamento {
  chave: string;
  descricao: string;
  detalhe: string;
  /** null = "a combinar" — a linha aparece mas não entra no total */
  valor: number | null;
}

interface OrcamentoInterno {
  areaEnvolventeM2: number;
  areaRealM2: number;
  aproveitamentoPct: number;
  custoMaterial: number | null;
  margemPct: number | null;
}

interface OrcamentoBase {
  itens: ItemOrcamento[];
  /** linhas válidas mesmo sem material (borda, recortes, complementos, instalação, frete) */
  itensParciais: ItemOrcamento[];
  /** distância de entrega não informada → frete "a combinar", fora do total */
  fretePendente: boolean;
  interno: OrcamentoInterno;
}

/**
 * União discriminada por `completo`: sem material não existe total, e o TS
 * garante que ninguém leia `total` como número sem antes checar `completo`.
 */
export type Orcamento =
  | (OrcamentoBase & { completo: true; subtotal: number; total: number })
  | (OrcamentoBase & { completo: false; subtotal: null; total: null });

const arred = (v: number): number => Math.round(v * 100) / 100;

/** Total já com o sufixo "+ frete" quando a distância não foi informada. */
export function rotuloTotal(orc: Orcamento & { completo: true }): string {
  return orc.fretePendente ? `${brl(orc.total)} + frete` : brl(orc.total);
}

export function calcularOrcamento(
  projeto: Projeto,
  tabela: TabelaPrecos,
): Orcamento {
  const { pontos, segmentos } = contornoBancada(projeto.bancada);
  const caixa = bbox(pontos);
  const preset = PRESETS[projeto.ambiente];

  const areaEnvolventeMm2 = caixa.largura * caixa.altura;
  const areaRealMm2 = areaPoligono(pontos);
  const areaEnvolventeM2 =
    mm2ParaM2(areaEnvolventeMm2) * tabela.fatorAproveitamento;
  const areaRealM2 = mm2ParaM2(areaRealMm2);

  const itens: ItemOrcamento[] = [];

  // 1. m² de chapa consumida × preço/m² — ÚNICO item que depende do material
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

  // 5. complementos (frontão, saia, rodabanca...) — R$/m linear × comprimento da borda
  //
  // REGRA v1 (pendente de confirmação da marmoraria): o preço é PURAMENTE
  // linear e NÃO usa `c.altura`. Ok para saia de ~8 cm; subestima o painel de
  // ilha que desce até o piso (chapa cortada cobrada como metro de saia).
  // Não mudar a fórmula sem decisão de negócio. Ver quote.test.ts.
  for (const c of projeto.complementos) {
    const precoM = tabela.complemento[c.tipo] ?? 0;
    if (precoM <= 0) continue;
    let compMm = segmentosDoComplemento(segmentos, c).reduce(
      (acc, s) => acc + s.comprimento,
      0,
    );
    if (compMm <= 0 && c.trechos.length) {
      compMm = c.trechos.reduce(
        (acc, ti) => acc + (projeto.bancada.trechos[ti]?.comprimento ?? 0),
        0,
      );
    }
    const compM = compMm / 1000;
    if (compM <= 0) continue;
    const reforco = c.reforco ? 1.25 : 1;
    itens.push({
      chave: `complemento_${c.id}`,
      descricao: `${rotuloComplemento(c.tipo)}${c.lado ? ` — ${c.lado}` : ""}`,
      detalhe: `${compM.toFixed(2)} m · altura ${Math.round(c.altura / 10)} cm${c.reforco ? " · reforçada" : ""}`,
      valor: arred(compM * precoM * reforco),
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

  // 7. frete — 0 (retirada) entra no total; ausente fica "a combinar", fora dele
  const distanciaKm = projeto.distanciaKm;
  const fretePendente = distanciaKm == null; // undefined/null → pendente; 0 → NÃO
  if (fretePendente) {
    itens.push({
      chave: "frete",
      descricao: "Frete",
      detalhe: "a combinar",
      valor: null,
    });
  } else if (distanciaKm === 0) {
    itens.push({
      chave: "frete",
      descricao: "Frete",
      detalhe: "retirada na loja",
      valor: 0,
    });
  } else {
    const ultima = tabela.frete[tabela.frete.length - 1];
    const faixa = tabela.frete.find((f) => distanciaKm <= f.ateKm) ?? ultima;
    itens.push({
      chave: "frete",
      descricao: "Frete",
      detalhe: faixa
        ? distanciaKm <= faixa.ateKm
          ? `até ${faixa.ateKm} km`
          : `acima de ${faixa.ateKm} km`
        : `${distanciaKm} km`,
      valor: faixa ? arred(faixa.valor) : 0,
    });
  }

  const subtotal = arred(
    itens.reduce((acc, i) => acc + (i.valor ?? 0), 0),
  );

  const custoMaterial = projeto.material?.custoM2
    ? arred(areaEnvolventeM2 * projeto.material.custoM2)
    : null;
  const margemPct =
    custoMaterial != null && subtotal > 0
      ? arred(((subtotal - custoMaterial) / subtotal) * 100)
      : null;

  const interno: OrcamentoInterno = {
    areaEnvolventeM2: arred(areaEnvolventeM2),
    areaRealM2: arred(areaRealM2),
    aproveitamentoPct:
      areaEnvolventeM2 > 0 ? arred((areaRealM2 / areaEnvolventeM2) * 100) : 0,
    custoMaterial,
    margemPct,
  };

  const itensParciais = itens.filter((i) => i.chave !== "chapa");
  const completo = projeto.material != null;

  if (!completo) {
    return {
      completo: false,
      itens,
      itensParciais,
      fretePendente,
      subtotal: null,
      total: null,
      interno,
    };
  }

  return {
    completo: true,
    itens,
    itensParciais,
    fretePendente,
    subtotal,
    total: subtotal,
    interno,
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
