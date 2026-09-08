import { describe, expect, it } from "vitest";
import {
  bbox,
  bordaAcabadaMm,
  contornoBancada,
  dist,
  geometriaRecorte,
  medidasValidas,
  recorteCabeNoTrecho,
  segmentosDoComplemento,
} from "./geometry";
import type { Bancada, Complemento, Projeto, Recorte } from "./project";
import { projetoNovo } from "./presets";
import { calcularOrcamento } from "./quote";
import { TABELA_PADRAO } from "./tabelaPrecos";

const bancada = (
  formato: Bancada["formato"],
  trechos: Bancada["trechos"],
): Bancada => ({ formato, trechos, espessura: 20, alturaInstalacao: 900 });

const inteiro = (n: number) => Number.isInteger(n);

// ---------------------------------------------------------------------------

describe("contornoBancada — retângulo envolvente por formato", () => {
  it("linear: bbox = comprimento × profundidade", () => {
    const { pontos } = contornoBancada(
      bancada("linear", [{ comprimento: 2000, profundidade: 600 }]),
    );
    const b = bbox(pontos);
    expect(b.largura).toBe(2000);
    expect(b.altura).toBe(600);
  });

  it("L: envolvente = braço A (x) × braço B (y)", () => {
    const b = bbox(
      contornoBancada(
        bancada("L", [
          { comprimento: 2200, profundidade: 600 },
          { comprimento: 1800, profundidade: 600 },
        ]),
      ).pontos,
    );
    expect(b.largura).toBe(2200);
    expect(b.altura).toBe(1800);
  });

  it("P: mesma envolvente do L (mesma topologia de contorno)", () => {
    const t: Bancada["trechos"] = [
      { comprimento: 2200, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ];
    const bL = bbox(contornoBancada(bancada("L", t)).pontos);
    const bP = bbox(contornoBancada(bancada("P", t)).pontos);
    expect(bP).toEqual(bL);
  });

  it("U: envolvente = base (x) × braço (y)", () => {
    const b = bbox(
      contornoBancada(
        bancada("U", [
          { comprimento: 1800, profundidade: 600 },
          { comprimento: 2400, profundidade: 600 },
          { comprimento: 1800, profundidade: 600 },
        ]),
      ).pontos,
    );
    expect(b.largura).toBe(2400);
    expect(b.altura).toBe(1800);
  });

  it("todo ponto e todo comprimento de segmento é mm inteiro (4 formatos, medidas ímpares)", () => {
    const casos: Array<[Bancada["formato"], Bancada["trechos"]]> = [
      ["linear", [{ comprimento: 1997, profundidade: 603 }]],
      ["L", [
        { comprimento: 2205, profundidade: 611 },
        { comprimento: 1803, profundidade: 611 },
      ]],
      ["P", [
        { comprimento: 2205, profundidade: 611 },
        { comprimento: 1803, profundidade: 611 },
      ]],
      ["U", [
        { comprimento: 1801, profundidade: 607 },
        { comprimento: 2403, profundidade: 607 },
        { comprimento: 1805, profundidade: 607 },
      ]],
    ];
    for (const [f, t] of casos) {
      const { pontos, segmentos } = contornoBancada(bancada(f, t));
      for (const p of pontos) {
        expect(inteiro(p.x)).toBe(true);
        expect(inteiro(p.y)).toBe(true);
      }
      for (const s of segmentos) expect(inteiro(s.comprimento)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------

describe("bordaAcabadaMm — metro linear de borda", () => {
  it("desconta a borda contra a parede quando nem tudo é acabado", () => {
    const { segmentos } = contornoBancada(
      bancada("linear", [{ comprimento: 2000, profundidade: 600 }]),
    );
    // perímetro 2*(2000+600) = 5200; o fundo (parede) = 2000
    expect(bordaAcabadaMm(segmentos, false)).toBe(2000 + 600 + 600);
    expect(bordaAcabadaMm(segmentos, true)).toBe(5200);
  });
});

describe("segmentosDoComplemento", () => {
  it("seleciona os segmentos pelo lado", () => {
    const { segmentos } = contornoBancada(
      bancada("linear", [{ comprimento: 2000, profundidade: 600 }]),
    );
    const saiaDir: Complemento = {
      id: "c1",
      tipo: "saia",
      altura: 100,
      lado: "direito",
      trechos: [],
    };
    const segs = segmentosDoComplemento(segmentos, saiaDir);
    expect(segs).toHaveLength(1);
    expect(segs[0].comprimento).toBe(600); // ponta direita = profundidade
  });
});

// ---------------------------------------------------------------------------

describe("geometriaRecorte — posição inteira, dimensão preservada", () => {
  const proj = (rec: Recorte): Projeto => {
    const p = projetoNovo("balcao");
    p.bancada = bancada("linear", [{ comprimento: 2000, profundidade: 600 }]);
    p.recortes = [rec];
    return p;
  };

  it("recorte centralizado com largura/prof ÍMPAR: offsets, cantos e centro são inteiros", () => {
    const rec: Recorte = {
      id: "r1",
      tipo: "cuba_embutir",
      largura: 561, // (2000 - 561) / 2 = 719,5
      profundidade: 341, // (600 - 341) / 2 = 129,5
      posicao: { trecho: 0, distanciaInicio: 0, centralizada: true },
    };
    const g = geometriaRecorte(proj(rec), rec);
    for (const c of g.cantos) {
      expect(inteiro(c.x)).toBe(true);
      expect(inteiro(c.y)).toBe(true);
    }
    expect(inteiro(g.centro.x)).toBe(true);
    expect(inteiro(g.centro.y)).toBe(true);
  });

  it("a largura e a profundidade declaradas são idênticas depois da transformação", () => {
    const rec: Recorte = {
      id: "r2",
      tipo: "cuba_embutir",
      largura: 561,
      profundidade: 341,
      posicao: { trecho: 0, distanciaInicio: 137, centralizada: false },
    };
    const g = geometriaRecorte(proj(rec), rec);
    // cantos = [p(0,0), p(largura,0), p(largura,prof), p(0,prof)]
    expect(dist(g.cantos[0], g.cantos[1])).toBe(561);
    expect(dist(g.cantos[1], g.cantos[2])).toBe(341);
    expect(dist(g.cantos[2], g.cantos[3])).toBe(561);
    expect(dist(g.cantos[3], g.cantos[0])).toBe(341);
  });

  it("furo: os 4 cantos formam um quadrado do tamanho do diâmetro; raio NÃO é arredondado", () => {
    const rec: Recorte = {
      id: "f1",
      tipo: "furo_torneira",
      largura: 35,
      profundidade: 35,
      diametro: 35,
      posicao: {
        trecho: 0,
        distanciaInicio: 100,
        centralizada: false,
        recuoFrontal: 60,
      },
    };
    const g = geometriaRecorte(proj(rec), rec);
    expect(dist(g.cantos[0], g.cantos[1])).toBe(35);
    expect(dist(g.cantos[1], g.cantos[2])).toBe(35);
    expect(g.raio).toBe(17.5); // dimensão derivada (Ø/2), preservada
  });
});

// ---------------------------------------------------------------------------
// Casos extremos de posicionamento — nada pode virar NaN, ficar fora do
// trecho (quando cabe) ou quebrar o cálculo por trás.
// ---------------------------------------------------------------------------

describe("geometriaRecorte — casos extremos de posição", () => {
  const proj = (formato: Bancada["formato"], trechos: Bancada["trechos"], rec: Recorte): Projeto => {
    const p = projetoNovo("balcao");
    p.bancada = bancada(formato, trechos);
    p.recortes = [rec];
    return p;
  };
  const trecho2000x600 = [{ comprimento: 2000, profundidade: 600 }];

  const semNaN = (g: ReturnType<typeof geometriaRecorte>) => {
    for (const c of g.cantos) {
      expect(Number.isNaN(c.x)).toBe(false);
      expect(Number.isNaN(c.y)).toBe(false);
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
    }
    expect(Number.isNaN(g.centro.x)).toBe(false);
    expect(Number.isNaN(g.centro.y)).toBe(false);
  };

  it("recorte colado no início (distanciaInicio negativo salvo) grampeia em 0, não em negativo", () => {
    const rec: Recorte = {
      id: "r1",
      tipo: "cuba_embutir",
      largura: 500,
      profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: -400, centralizada: false },
    };
    const g = geometriaRecorte(proj("linear", trecho2000x600, rec), rec);
    semNaN(g);
    const xs = g.cantos.map((c) => c.x);
    expect(Math.min(...xs)).toBe(0); // não vaza pra antes do início da peça
  });

  it("recorte perto do fim (distanciaInicio maior que o trecho permite) grampeia no limite, não passa da borda", () => {
    const rec: Recorte = {
      id: "r2",
      tipo: "cuba_embutir",
      largura: 500,
      profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 999999, centralizada: false },
    };
    const g = geometriaRecorte(proj("linear", trecho2000x600, rec), rec);
    semNaN(g);
    const xs = g.cantos.map((c) => c.x);
    expect(Math.max(...xs)).toBe(2000); // encosta exatamente na ponta, não passa
  });

  it("recuoFrontal fora dos limites (negativo ou gigante) também grampeia", () => {
    const negativo: Recorte = {
      id: "r3", tipo: "cooktop", largura: 500, profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 500, centralizada: false, recuoFrontal: -50 },
    };
    const gN = geometriaRecorte(proj("linear", trecho2000x600, negativo), negativo);
    semNaN(gN);
    expect(Math.min(...gN.cantos.map((c) => c.y))).toBe(0);

    const gigante: Recorte = {
      id: "r4", tipo: "cooktop", largura: 500, profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 500, centralizada: false, recuoFrontal: 99999 },
    };
    const gG = geometriaRecorte(proj("linear", trecho2000x600, gigante), gigante);
    semNaN(gG);
    expect(Math.max(...gG.cantos.map((c) => c.y))).toBe(600);
  });

  it("recorte maior que o trecho: não trava, não gera NaN, e o excesso fica visível (dimensão não é encolhida)", () => {
    const rec: Recorte = {
      id: "r5",
      tipo: "area_molhada",
      largura: 3000, // maior que o comprimento (2000) do trecho
      profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 500, centralizada: false },
    };
    const g = geometriaRecorte(proj("linear", trecho2000x600, rec), rec);
    semNaN(g);
    expect(dist(g.cantos[0], g.cantos[1])).toBe(3000); // dimensão preservada, não mentida
    // início gruda em 0 (não em algum ponto arbitrário) — minimiza o excesso
    expect(Math.min(...g.cantos.map((c) => c.x))).toBe(0);
  });

  it("dois recortes no mesmo trecho: cada um grampeia de forma independente, sem interferir um no outro", () => {
    const a: Recorte = {
      id: "a", tipo: "cuba_embutir", largura: 500, profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 100, centralizada: false },
    };
    const b: Recorte = {
      id: "b", tipo: "cooktop", largura: 580, profundidade: 500,
      posicao: { trecho: 0, distanciaInicio: 1300, centralizada: false },
    };
    const p = projetoNovo("balcao");
    p.bancada = bancada("linear", trecho2000x600);
    p.recortes = [a, b];
    const gA = geometriaRecorte(p, a);
    const gB = geometriaRecorte(p, b);
    semNaN(gA);
    semNaN(gB);
    // não se sobrepõem nesse cenário (100+500=600 <= 1300)
    expect(Math.max(...gA.cantos.map((c) => c.x))).toBeLessThanOrEqual(
      Math.min(...gB.cantos.map((c) => c.x)),
    );
  });

  it("furo com diâmetro 0 (dado degenerado) não gera NaN", () => {
    const rec: Recorte = {
      id: "f0", tipo: "furo_torneira", largura: 0, profundidade: 0, diametro: 0,
      posicao: { trecho: 0, distanciaInicio: 100, centralizada: false },
    };
    const g = geometriaRecorte(proj("linear", trecho2000x600, rec), rec);
    semNaN(g);
    expect(g.raio).toBe(0);
  });
});

describe("recorteCabeNoTrecho / medidasValidas", () => {
  it("recorte menor que o trecho cabe; maior não cabe", () => {
    const b = bancada("linear", [{ comprimento: 2000, profundidade: 600 }]);
    const cabe: Recorte = {
      id: "r1", tipo: "cuba_embutir", largura: 500, profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 0, centralizada: false },
    };
    const naoCabe: Recorte = {
      id: "r2", tipo: "cuba_embutir", largura: 2500, profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 0, centralizada: false },
    };
    expect(recorteCabeNoTrecho(b, cabe)).toBe(true);
    expect(recorteCabeNoTrecho(b, naoCabe)).toBe(false);
  });

  it("medidasValidas rejeita trecho com comprimento ou profundidade zero", () => {
    expect(medidasValidas(bancada("linear", [{ comprimento: 2000, profundidade: 600 }]))).toBe(true);
    expect(medidasValidas(bancada("linear", [{ comprimento: 0, profundidade: 600 }]))).toBe(false);
    expect(medidasValidas(bancada("linear", [{ comprimento: 2000, profundidade: 0 }]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Consistência 2D / 3D / orçamento — os três precisam representar a MESMA
// peça. Drawing2D e Scene3D chamam `contornoBancada` diretamente (auditado
// por leitura de código); aqui garantimos que `quote.ts` — que também
// deriva dele — não duplica a lógica com um resultado diferente.
// ---------------------------------------------------------------------------

describe("consistência: contornoBancada é a única fonte, quote.ts não diverge", () => {
  const casos: Array<[string, Bancada["formato"], Bancada["trechos"]]> = [
    ["linear", "linear", [{ comprimento: 2000, profundidade: 600 }]],
    ["L", "L", [{ comprimento: 2200, profundidade: 600 }, { comprimento: 1800, profundidade: 600 }]],
    ["P", "P", [{ comprimento: 2200, profundidade: 600 }, { comprimento: 700, profundidade: 600 }]],
    ["U", "U", [
      { comprimento: 1800, profundidade: 600 },
      { comprimento: 2400, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ]],
  ];

  for (const [nome, formato, trechos] of casos) {
    it(`${nome}: retângulo envolvente do orçamento == bbox(contornoBancada)`, () => {
      const p = projetoNovo("balcao");
      p.bancada = bancada(formato, trechos);
      const bDireto = bbox(contornoBancada(p.bancada).pontos);
      const orc = calcularOrcamento(p, TABELA_PADRAO);
      // orc.interno guarda em m² já com o fator de aproveitamento — refaz a
      // conta inversa só com bbox pra comparar maçã com maçã
      const largM = bDireto.largura / 1000;
      const altM = bDireto.altura / 1000;
      const esperadoM2 = Math.round(largM * altM * TABELA_PADRAO.fatorAproveitamento * 100) / 100;
      expect(orc.interno.areaEnvolventeM2).toBe(esperadoM2);
    });
  }

  it("P e L com os MESMOS trechos geram exatamente o mesmo polígono (mesma topologia, é a proporção-padrão que muda)", () => {
    const t: Bancada["trechos"] = [
      { comprimento: 2200, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ];
    expect(contornoBancada(bancada("P", t)).pontos).toEqual(
      contornoBancada(bancada("L", t)).pontos,
    );
  });
});
