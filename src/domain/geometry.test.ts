import { describe, expect, it } from "vitest";
import {
  bbox,
  bordaAcabadaMm,
  contornoBancada,
  dist,
  geometriaRecorte,
  segmentosDoComplemento,
} from "./geometry";
import type { Bancada, Complemento, Projeto, Recorte } from "./project";
import { projetoNovo } from "./presets";

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
