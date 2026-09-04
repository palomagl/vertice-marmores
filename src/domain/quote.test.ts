import { describe, expect, it } from "vitest";
import type { Material, Projeto } from "./project";
import { projetoNovo } from "./presets";
import { calcularOrcamento, rotuloTotal } from "./quote";
import { TABELA_PADRAO } from "./tabelaPrecos";

const MAT: Material = {
  id: "mat_teste",
  nome: "Granito Teste",
  texturaUrl: "",
  precoM2: 100,
  custoM2: 60,
  chapa: { largura: 3000, altura: 1900 },
};

/** balcão = sem recortes, sem frontão/saia, todas as bordas acabadas */
function proj(
  formato: Projeto["bancada"]["formato"],
  trechos: Projeto["bancada"]["trechos"],
  patch: Partial<Projeto> = {},
): Projeto {
  const p = projetoNovo("balcao");
  p.bancada = { formato, trechos, espessura: 20, alturaInstalacao: 900 };
  p.recortes = [];
  p.complementos = [];
  return { ...p, ...patch };
}

const linear2000x600 = (patch: Partial<Projeto> = {}) =>
  proj("linear", [{ comprimento: 2000, profundidade: 600 }], patch);

type Orc = ReturnType<typeof calcularOrcamento>;
const item = (orc: Orc, chave: string) => orc.itens.find((i) => i.chave === chave);

// ---------------------------------------------------------------------------

describe("m² por retângulo envolvente", () => {
  it("linear 2,00 × 0,60 → 1,20 m² e chapa = m² × preço", () => {
    const orc = calcularOrcamento(linear2000x600({ material: MAT }), TABELA_PADRAO);
    expect(orc.interno.areaEnvolventeM2).toBe(1.2);
    expect(item(orc, "chapa")?.valor).toBe(120);
  });

  it("L 2,20 × 1,80 (envolvente) → 3,96 m²", () => {
    const orc = calcularOrcamento(
      proj(
        "L",
        [
          { comprimento: 2200, profundidade: 600 },
          { comprimento: 1800, profundidade: 600 },
        ],
        { material: MAT },
      ),
      TABELA_PADRAO,
    );
    expect(orc.interno.areaEnvolventeM2).toBe(3.96);
  });

  it("P: mesma envolvente do L", () => {
    const t: Projeto["bancada"]["trechos"] = [
      { comprimento: 2200, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ];
    const aL = calcularOrcamento(proj("L", t, { material: MAT }), TABELA_PADRAO)
      .interno.areaEnvolventeM2;
    const aP = calcularOrcamento(proj("P", t, { material: MAT }), TABELA_PADRAO)
      .interno.areaEnvolventeM2;
    expect(aP).toBe(aL);
  });

  it("U 2,40 × 1,80 (envolvente) → 4,32 m²", () => {
    const orc = calcularOrcamento(
      proj(
        "U",
        [
          { comprimento: 1800, profundidade: 600 },
          { comprimento: 2400, profundidade: 600 },
          { comprimento: 1800, profundidade: 600 },
        ],
        { material: MAT },
      ),
      TABELA_PADRAO,
    );
    expect(orc.interno.areaEnvolventeM2).toBe(4.32);
  });
});

describe("fator de aproveitamento", () => {
  it("multiplica só a área de chapa; instalação não muda", () => {
    const tab = { ...TABELA_PADRAO, fatorAproveitamento: 1.15 };
    const orc = calcularOrcamento(linear2000x600({ material: MAT }), tab);
    expect(orc.interno.areaEnvolventeM2).toBe(1.38); // 1,20 × 1,15
    expect(item(orc, "chapa")?.valor).toBe(138);
    expect(item(orc, "instalacao")?.valor).toBe(250);
  });
});

describe("acabamento de borda", () => {
  it("metro linear, descontando a borda contra a parede (ambiente pia)", () => {
    const p = projetoNovo("pia");
    p.recortes = [];
    p.complementos = [];
    p.bancada.trechos = [{ comprimento: 2000, profundidade: 600 }];
    p.material = MAT;
    // (2000 + 600 + 600) / 1000 × 45 (reto)
    expect(item(calcularOrcamento(p, TABELA_PADRAO), "acabamento")?.valor).toBe(144);
  });

  it("ilha acaba todas as bordas", () => {
    const p = projetoNovo("ilha");
    p.recortes = [];
    p.complementos = [];
    p.bancada.trechos = [{ comprimento: 2000, profundidade: 600 }];
    p.material = MAT;
    // 2*(2000+600)/1000 × 45
    expect(item(calcularOrcamento(p, TABELA_PADRAO), "acabamento")?.valor).toBe(234);
  });
});

describe("recortes", () => {
  it("valor fixo por peça, independente do tamanho", () => {
    const base = linear2000x600({ material: MAT });
    const p1: Projeto = {
      ...base,
      recortes: [
        {
          id: "a",
          tipo: "cuba_embutir",
          largura: 500,
          profundidade: 400,
          posicao: { trecho: 0, distanciaInicio: 100, centralizada: false },
        },
      ],
    };
    const p2: Projeto = {
      ...base,
      recortes: [
        {
          id: "b",
          tipo: "cuba_embutir",
          largura: 800,
          profundidade: 500,
          posicao: { trecho: 0, distanciaInicio: 100, centralizada: false },
        },
      ],
    };
    expect(item(calcularOrcamento(p1, TABELA_PADRAO), "recorte_a")?.valor).toBe(90);
    expect(item(calcularOrcamento(p2, TABELA_PADRAO), "recorte_b")?.valor).toBe(90);
  });
});

describe("complementos", () => {
  const base = () => linear2000x600({ material: MAT });

  it("reforço multiplica o valor por 1,25", () => {
    const semRef: Projeto = {
      ...base(),
      complementos: [
        { id: "s", tipo: "saia", altura: 80, lado: "frontal", trechos: [] },
      ],
    };
    const comRef: Projeto = {
      ...base(),
      complementos: [
        { id: "s", tipo: "saia", altura: 80, lado: "frontal", reforco: true, trechos: [] },
      ],
    };
    const a = item(calcularOrcamento(semRef, TABELA_PADRAO), "complemento_s")?.valor;
    const b = item(calcularOrcamento(comRef, TABELA_PADRAO), "complemento_s")?.valor;
    expect(a).toBe(300); // 2,0 m × R$150
    expect(b).toBe(375); // × 1,25
    expect(b).toBe((a as number) * 1.25);
  });

  it("REGRA v1 (pendente da marmoraria): preço é linear e NÃO depende da altura", () => {
    // saia de 8 cm e painel de ilha até o piso (88 cm) custam o mesmo por metro.
    // Se um dia o preço passar a considerar a altura, este teste quebra de
    // propósito — é o gatilho pra revisar a regra com a marmoraria.
    const baixa: Projeto = {
      ...base(),
      complementos: [
        { id: "p", tipo: "saia", altura: 80, lado: "esquerdo", trechos: [] },
      ],
    };
    const piso: Projeto = {
      ...base(),
      complementos: [
        { id: "p", tipo: "saia", altura: 880, lado: "esquerdo", trechos: [] },
      ],
    };
    const a = item(calcularOrcamento(baixa, TABELA_PADRAO), "complemento_p")?.valor;
    const b = item(calcularOrcamento(piso, TABELA_PADRAO), "complemento_p")?.valor;
    expect(b).toBe(a);
  });
});

// ---------------------------------------------------------------------------

describe("frete por faixa de km", () => {
  const comKm = (km: number | undefined) =>
    calcularOrcamento(linear2000x600({ material: MAT, distanciaKm: km }), TABELA_PADRAO);

  it("km vazio → linha 'a combinar', fora do total, fretePendente true", () => {
    const vazio = comKm(undefined);
    const zero = comKm(0);
    expect(item(vazio, "frete")?.valor).toBeNull();
    expect(vazio.fretePendente).toBe(true);
    // km vazio e retirada (R$0) têm o MESMO total — a diferença é só o rótulo
    expect(vazio.completo && vazio.total).toBe(zero.completo && zero.total);
  });

  it("km = 0 é DIFERENTE de vazio: retirada na loja, frete R$ 0, no total, fretePendente false", () => {
    const zero = comKm(0);
    expect(zero.fretePendente).toBe(false);
    expect(item(zero, "frete")?.valor).toBe(0);
    expect(item(zero, "frete")?.detalhe).toBe("retirada na loja");
  });

  it("km com valor entra no total", () => {
    const zero = comKm(0);
    const trinta = comKm(30);
    const base = zero.completo ? zero.total : 0;
    expect(trinta.completo && trinta.total).toBe(base + 160);
  });

  it("limites exatos de cada faixa e o valor logo acima da última", () => {
    expect(item(comKm(15), "frete")?.valor).toBe(80); // limite da faixa 1
    expect(item(comKm(16), "frete")?.valor).toBe(160); // 1 km acima → faixa 2
    expect(item(comKm(40), "frete")?.valor).toBe(160); // limite da faixa 2
    expect(item(comKm(41), "frete")?.valor).toBe(320); // faixa 3
    expect(item(comKm(80), "frete")?.valor).toBe(320); // limite da última faixa
    expect(item(comKm(81), "frete")?.valor).toBe(320); // acima da última → mantém a última
  });

  it("rótulo do total: '+ frete' só quando a distância não foi informada", () => {
    const vazio = comKm(undefined);
    const zero = comKm(0);
    const trinta = comKm(30);
    expect(vazio.completo).toBe(true);
    if (vazio.completo) expect(rotuloTotal(vazio).endsWith("+ frete")).toBe(true);
    if (zero.completo) expect(rotuloTotal(zero).includes("+ frete")).toBe(false);
    if (trinta.completo) expect(rotuloTotal(trinta).includes("+ frete")).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("sem pedra selecionada", () => {
  it("retorna completo:false e total:null — nunca zero", () => {
    const orc = calcularOrcamento(linear2000x600(), TABELA_PADRAO);
    expect(orc.completo).toBe(false);
    expect(orc.total).toBeNull();
    expect(orc.subtotal).toBeNull();
    expect(orc.itens.some((i) => i.chave === "chapa")).toBe(false);
  });

  it("as linhas de mão de obra continuam em itensParciais (sem a de material)", () => {
    const orc = calcularOrcamento(
      proj("linear", [{ comprimento: 2000, profundidade: 600 }]),
      TABELA_PADRAO,
    );
    expect(orc.itensParciais.find((i) => i.chave === "acabamento")).toBeDefined();
    expect(orc.itensParciais.find((i) => i.chave === "instalacao")).toBeDefined();
    expect(orc.itensParciais.every((i) => i.chave !== "chapa")).toBe(true);
  });

  it("regressão dos dois casos do bug: não têm mais total", () => {
    const orcPia = calcularOrcamento(projetoNovo("pia"), TABELA_PADRAO); // 2,00 × 0,60
    const orcIlha = calcularOrcamento(projetoNovo("ilha"), TABELA_PADRAO); // 2,00 × 0,90 + painéis
    expect(orcPia.total).toBeNull();
    expect(orcIlha.total).toBeNull();
    // o número que ANTES vazava no rodapé era a soma das linhas de mão de obra:
    const soma = (o: Orc) => o.itensParciais.reduce((a, i) => a + (i.valor ?? 0), 0);
    expect(soma(orcPia)).toBe(724);
    expect(soma(orcIlha)).toBe(871);
  });
});

describe("precisão monetária", () => {
  it("todo valor em R$ tem no máximo 2 casas decimais", () => {
    const p = projetoNovo("gourmet");
    p.material = MAT;
    p.distanciaKm = 37;
    const orc = calcularOrcamento(p, TABELA_PADRAO);
    for (const i of orc.itens) {
      if (i.valor == null) continue;
      expect(i.valor).toBe(Math.round(i.valor * 100) / 100);
    }
    if (orc.completo) {
      expect(orc.total).toBe(Math.round(orc.total * 100) / 100);
    }
  });
});
