/**
 * Derivação geométrica — a fonte única compartilhada por 2D (SVG), 3D (ExtrudeGeometry),
 * AR e proposta. Puramente derivado do modelo; nunca guarda coordenada de tela.
 *
 * Sistema de coordenadas: milímetros, convenção matemática (x direita, y "para o fundo").
 * A frente da bancada fica em y = 0. A parede fica no y maior.
 */
import type { Bancada, Complemento, Lado, Projeto, Recorte } from "./project";

export interface Ponto {
  x: number;
  y: number;
}

export interface Segmento {
  a: Ponto;
  b: Ponto;
  comprimento: number;
  /** índice do trecho a que este segmento pertence (frente/ponta) ou -1 */
  trecho: number;
  /** true = encostado na parede, não leva acabamento de borda */
  parede: boolean;
  /** lado da peça, para posicionar frontão / saia */
  lado: Lado | null;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  largura: number;
  altura: number;
}

export const dist = (a: Ponto, b: Ponto): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

const soma = (a: Ponto, b: Ponto): Ponto => ({ x: a.x + b.x, y: a.y + b.y });
const escala = (a: Ponto, k: number): Ponto => ({ x: a.x * k, y: a.y * k });

export function normalizar(v: Ponto): Ponto {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}

/** Fecha a lista de pontos em segmentos, aplicando as máscaras. */
function segmentos(
  pontos: Ponto[],
  paredeMask: boolean[],
  trechoMask: number[],
  ladoMask: (Lado | null)[],
): Segmento[] {
  return pontos.map((a, i) => {
    const b = pontos[(i + 1) % pontos.length];
    return {
      a,
      b,
      comprimento: dist(a, b),
      parede: paredeMask[i] ?? false,
      trecho: trechoMask[i] ?? -1,
      lado: ladoMask[i] ?? null,
    };
  });
}

/**
 * Contorno da bancada como polígono fechado (sem repetir o último ponto).
 * Retorna também os segmentos já classificados como parede / acabado.
 */
export function contornoBancada(bancada: Bancada): {
  pontos: Ponto[];
  segmentos: Segmento[];
} {
  const t = bancada.trechos;

  switch (bancada.formato) {
    case "L":
    case "P": {
      const La = t[0].comprimento;
      const P0 = t[0].profundidade;
      const Lb = t[1]?.comprimento ?? La;
      const P1 = t[1]?.profundidade ?? P0;
      const pontos: Ponto[] = [
        { x: 0, y: 0 },
        { x: La, y: 0 },
        { x: La, y: P0 },
        { x: P1, y: P0 },
        { x: P1, y: Lb },
        { x: 0, y: Lb },
      ];
      // frente A, ponta A, PAREDE A, PAREDE B, ponta B, frente B
      const parede = [false, false, true, true, false, false];
      const trecho = [0, 0, 0, 1, 1, 1];
      const lado: (Lado | null)[] = [
        "frontal", "direito", "traseiro", "traseiro", "esquerdo", "frontal",
      ];
      return { pontos, segmentos: segmentos(pontos, parede, trecho, lado) };
    }

    case "U": {
      const La = t[0].comprimento;
      const Pa = t[0].profundidade;
      const Lb = t[1]?.comprimento ?? La;
      const Pb = t[1]?.profundidade ?? Pa;
      const Lc = t[2]?.comprimento ?? La;
      const Pc = t[2]?.profundidade ?? Pa;
      const pontos: Ponto[] = [
        { x: 0, y: 0 },
        { x: Lb, y: 0 },
        { x: Lb, y: Lc },
        { x: Lb - Pc, y: Lc },
        { x: Lb - Pc, y: Pb },
        { x: Pa, y: Pb },
        { x: Pa, y: La },
        { x: 0, y: La },
      ];
      const parede = [false, false, false, true, true, true, false, false];
      const trecho = [1, 2, 2, 2, 1, 0, 0, 0];
      const lado: (Lado | null)[] = [
        "frontal", "direito", "direito", "traseiro", "traseiro", "traseiro", "esquerdo", "esquerdo",
      ];
      return { pontos, segmentos: segmentos(pontos, parede, trecho, lado) };
    }

    case "linear":
    case "personalizado":
    default: {
      const L = t[0].comprimento;
      const P = t[0].profundidade;
      const pontos: Ponto[] = [
        { x: 0, y: 0 },
        { x: L, y: 0 },
        { x: L, y: P },
        { x: 0, y: P },
      ];
      // frente, ponta, PAREDE (fundo), ponta
      const parede = [false, false, true, false];
      const trecho = [0, 0, 0, 0];
      const lado: (Lado | null)[] = ["frontal", "direito", "traseiro", "esquerdo"];
      return { pontos, segmentos: segmentos(pontos, parede, trecho, lado) };
    }
  }
}

export function bbox(pontos: Ponto[]): BBox {
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, largura: maxX - minX, altura: maxY - minY };
}

export function centroide(pontos: Ponto[]): Ponto {
  const s = pontos.reduce((acc, p) => soma(acc, p), { x: 0, y: 0 });
  return escala(s, 1 / pontos.length);
}

/** Área real do polígono (fórmula do shoelace), em mm². */
export function areaPoligono(pontos: Ponto[]): number {
  let s = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Metro linear de borda que recebe acabamento (exclui o que encosta na parede). */
export function bordaAcabadaMm(
  segs: Segmento[],
  todasBordasAcabadas: boolean,
): number {
  return segs
    .filter((s) => todasBordasAcabadas || !s.parede)
    .reduce((acc, s) => acc + s.comprimento, 0);
}

/** Segmentos que recebem um complemento. Usa `lado` quando definido. */
export function segmentosDoComplemento(
  segs: Segmento[],
  comp: Complemento,
): Segmento[] {
  if (comp.lado) return segs.filter((s) => s.lado === comp.lado);
  const naParede = comp.tipo === "frontao" || comp.tipo === "rodabanca";
  return segs.filter(
    (s) => s.parede === naParede && comp.trechos.includes(s.trecho),
  );
}

// ---------------------------------------------------------------------------
// Posicionamento de recortes — mesmo espaço de coordenadas do contorno.
// ---------------------------------------------------------------------------

export interface FrameTrecho {
  origem: Ponto;
  /** direção do comprimento do trecho (unitária) */
  eixo: Ponto;
  /** direção da profundidade, apontando para o fundo (unitária) */
  normal: Ponto;
}

export function frameTrecho(bancada: Bancada, i: number): FrameTrecho {
  const t = bancada.trechos;
  if (bancada.formato === "L" || bancada.formato === "P") {
    if (i === 1) return { origem: { x: 0, y: 0 }, eixo: { x: 0, y: 1 }, normal: { x: 1, y: 0 } };
    return { origem: { x: 0, y: 0 }, eixo: { x: 1, y: 0 }, normal: { x: 0, y: 1 } };
  }
  if (bancada.formato === "U") {
    const Lb = t[1]?.comprimento ?? t[0].comprimento;
    if (i === 0) return { origem: { x: 0, y: 0 }, eixo: { x: 0, y: 1 }, normal: { x: 1, y: 0 } };
    if (i === 2) return { origem: { x: Lb, y: 0 }, eixo: { x: 0, y: 1 }, normal: { x: -1, y: 0 } };
    return { origem: { x: 0, y: 0 }, eixo: { x: 1, y: 0 }, normal: { x: 0, y: 1 } };
  }
  return { origem: { x: 0, y: 0 }, eixo: { x: 1, y: 0 }, normal: { x: 0, y: 1 } };
}

export interface RecorteGeometria {
  /** 4 cantos no espaço do contorno (retângulos e furos como quadrado envolvente) */
  cantos: Ponto[];
  centro: Ponto;
  /** para furos */
  raio?: number;
  recorte: Recorte;
}

export function geometriaRecorte(
  projeto: Projeto,
  recorte: Recorte,
): RecorteGeometria {
  const { bancada } = projeto;
  const i = Math.min(recorte.posicao.trecho, bancada.trechos.length - 1);
  const trecho = bancada.trechos[i];
  const { origem, eixo, normal } = frameTrecho(bancada, i);

  const ehFuro = recorte.tipo === "furo_torneira" || recorte.tipo === "furo_dosador";
  // DIMENSÕES do recorte: nunca arredondar, senão a cuba/furo pode não encaixar.
  const largura = ehFuro ? (recorte.diametro ?? 35) : recorte.largura;
  const prof = ehFuro ? (recorte.diametro ?? 35) : recorte.profundidade;

  // POSIÇÃO: arredonda para mm inteiro (a serra não corta em 0,5 mm). O "fim" do
  // recorte é derivado de início + largura, então a largura declarada é preservada.
  const along = Math.round(
    recorte.posicao.centralizada
      ? (trecho.comprimento - largura) / 2
      : recorte.posicao.distanciaInicio,
  );
  const recuo = Math.round(
    recorte.posicao.recuoFrontal ?? (trecho.profundidade - prof) / 2,
  );

  const base: Ponto = {
    x: origem.x + eixo.x * along + normal.x * recuo,
    y: origem.y + eixo.y * along + normal.y * recuo,
  };
  const p = (a: number, n: number): Ponto => ({
    x: base.x + eixo.x * a + normal.x * n,
    y: base.y + eixo.y * a + normal.y * n,
  });
  const cantos = [p(0, 0), p(largura, 0), p(largura, prof), p(0, prof)];
  const meio = p(largura / 2, prof / 2);
  const centro: Ponto = { x: Math.round(meio.x), y: Math.round(meio.y) };

  return {
    cantos,
    centro,
    // raio é DIMENSÃO (metade do diâmetro) — não arredondar.
    raio: ehFuro ? largura / 2 : undefined,
    recorte,
  };
}
