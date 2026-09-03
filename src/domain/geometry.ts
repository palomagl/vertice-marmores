/**
 * Derivação geométrica — a fonte única compartilhada por 2D (SVG), 3D (ExtrudeGeometry),
 * AR e proposta. Puramente derivado do modelo; nunca guarda coordenada de tela.
 *
 * Sistema de coordenadas: milímetros, convenção matemática (x direita, y "para o fundo").
 * A frente da bancada fica em y = 0. A parede fica no y maior.
 */
import type { Bancada, Projeto, Recorte } from "./project";

export interface Ponto {
  x: number;
  y: number;
}

export interface Segmento {
  a: Ponto;
  b: Ponto;
  comprimento: number;
  /** true = encostado na parede, não leva acabamento de borda */
  parede: boolean;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  largura: number;
  altura: number;
}

const dist = (a: Ponto, b: Ponto): number => Math.hypot(b.x - a.x, b.y - a.y);

/** Fecha a lista de pontos em segmentos, aplicando a máscara de parede. */
function segmentos(pontos: Ponto[], paredeMask: boolean[]): Segmento[] {
  return pontos.map((a, i) => {
    const b = pontos[(i + 1) % pontos.length];
    return { a, b, comprimento: dist(a, b), parede: paredeMask[i] ?? false };
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
      return { pontos, segmentos: segmentos(pontos, parede) };
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
      return { pontos, segmentos: segmentos(pontos, parede) };
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
      return { pontos, segmentos: segmentos(pontos, parede) };
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

// ---------------------------------------------------------------------------
// Posicionamento de recortes — mesmo espaço de coordenadas do contorno.
// ---------------------------------------------------------------------------

interface FrameTrecho {
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
  const largura = ehFuro ? (recorte.diametro ?? 35) : recorte.largura;
  const prof = ehFuro ? (recorte.diametro ?? 35) : recorte.profundidade;

  const along = recorte.posicao.centralizada
    ? (trecho.comprimento - largura) / 2
    : recorte.posicao.distanciaInicio;
  const recuo =
    recorte.posicao.recuoFrontal ?? (trecho.profundidade - prof) / 2;

  const base: Ponto = {
    x: origem.x + eixo.x * along + normal.x * recuo,
    y: origem.y + eixo.y * along + normal.y * recuo,
  };
  const p = (a: number, n: number): Ponto => ({
    x: base.x + eixo.x * a + normal.x * n,
    y: base.y + eixo.y * a + normal.y * n,
  });
  const cantos = [p(0, 0), p(largura, 0), p(largura, prof), p(0, prof)];
  const centro = p(largura / 2, prof / 2);

  return {
    cantos,
    centro,
    raio: ehFuro ? largura / 2 : undefined,
    recorte,
  };
}
