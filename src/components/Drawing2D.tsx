/**
 * Renderizador 2D — SVG puro derivado do modelo (especificação, seção 4.1).
 * Nunca guarda coordenada de tela: tudo é calculado a partir do Projeto.
 * O mesmo SVG entra inline na proposta e imprime vetorial (seção 10).
 *
 * O viewBox é dimensionado pela UNIÃO de tudo que é desenhado (peça + cotas +
 * complementos), então nada fica cortado nem escondido atrás dos painéis.
 */
import { useMemo } from "react";
import {
  bbox,
  centroide,
  contornoBancada,
  dist,
  frameTrecho,
  geometriaRecorte,
  normalizar,
  segmentosDoComplemento,
  type Ponto,
} from "@/domain/geometry";
import type { Projeto } from "@/domain/project";
import { mmParaCmLabel } from "@/domain/units";

interface Props {
  projeto: Projeto;
  /** cor de preenchimento da peça; default = "maquete" cinza claro */
  cor?: string;
  className?: string;
}

interface Cota {
  a: Ponto;
  b: Ponto;
  a2: Ponto;
  b2: Ponto;
  perp: Ponto;
  label: string;
  labelPos: Ponto;
}

interface LinhaComp {
  a: Ponto;
  b: Ponto;
  cor: string;
  tracejado: boolean;
  label?: string;
  labelPos?: Ponto;
}

const COMP_COR: Record<string, string> = {
  frontao: "#475569",
  saia: "#0891b2",
  rodabanca: "#7c3aed",
  soleira: "#0891b2",
  pingadeira: "#0891b2",
};

export function Drawing2D({ projeto, cor = "#d8d8d5", className }: Props) {
  const modelo = useMemo(() => build(projeto), [projeto]);

  const { pontos, segsParede, recortes, cotas, comps, ext, fs, stroke } = modelo;

  const m = Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY) * 0.03;
  const vbW = ext.maxX - ext.minX + m * 2;
  const vbH = ext.maxY - ext.minY + m * 2;
  const sx = (x: number) => x - ext.minX + m;
  const sy = (y: number) => ext.maxY - y + m; // flip: fundo para cima da tela
  const S = (p: Ponto) => `${sx(p.x)},${sy(p.y)}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <polygon
        points={pontos.map(S).join(" ")}
        fill={cor}
        stroke="#3a3a3a"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />

      {/* bordas de parede: hachura */}
      {segsParede.map((s, i) => (
        <line
          key={`w${i}`}
          x1={sx(s.a.x)}
          y1={sy(s.a.y)}
          x2={sx(s.b.x)}
          y2={sy(s.b.y)}
          stroke="#9aa0a6"
          strokeWidth={stroke * 2.4}
          strokeDasharray={`${fs * 0.45} ${fs * 0.32}`}
        />
      ))}

      {/* complementos (frontão, saia, ...) */}
      {comps.map((c, i) => (
        <g key={`c${i}`}>
          <line
            x1={sx(c.a.x)}
            y1={sy(c.a.y)}
            x2={sx(c.b.x)}
            y2={sy(c.b.y)}
            stroke={c.cor}
            strokeWidth={stroke * 2}
            strokeDasharray={c.tracejado ? `${fs * 0.4} ${fs * 0.25}` : undefined}
            strokeLinecap="round"
          />
          {c.label && c.labelPos && (
            <text
              x={sx(c.labelPos.x)}
              y={sy(c.labelPos.y)}
              fontSize={fs * 0.72}
              fill={c.cor}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="system-ui, sans-serif"
              fontWeight={600}
            >
              {c.label}
            </text>
          )}
        </g>
      ))}

      {/* recortes */}
      {recortes.map((g, i) => {
        const r = g.recorte;
        if (g.raio != null) {
          return (
            <circle
              key={i}
              cx={sx(g.centro.x)}
              cy={sy(g.centro.y)}
              r={g.raio}
              fill="#fff"
              stroke="#c0392b"
              strokeWidth={stroke}
            />
          );
        }
        if (r.tipo === "area_molhada" && r.canto === "oval") {
          return (
            <ellipse
              key={i}
              cx={sx(g.centro.x)}
              cy={sy(g.centro.y)}
              rx={r.largura / 2}
              ry={r.profundidade / 2}
              fill="#fff"
              stroke="#c0392b"
              strokeWidth={stroke}
            />
          );
        }
        return (
          <polygon
            key={i}
            points={g.cantos.map(S).join(" ")}
            fill="#fff"
            stroke="#c0392b"
            strokeWidth={stroke}
          />
        );
      })}

      {/* cotas */}
      {cotas.map((c, i) => (
        <g key={`d${i}`} stroke="#1e293b" strokeWidth={Math.max(fs * 0.045, 2)} fill="none">
          <line x1={sx(c.a.x)} y1={sy(c.a.y)} x2={sx(c.a2.x)} y2={sy(c.a2.y)} opacity={0.45} />
          <line x1={sx(c.b.x)} y1={sy(c.b.y)} x2={sx(c.b2.x)} y2={sy(c.b2.y)} opacity={0.45} />
          <line x1={sx(c.a2.x)} y1={sy(c.a2.y)} x2={sx(c.b2.x)} y2={sy(c.b2.y)} />
          <line
            x1={sx(c.a2.x - c.perp.x * fs * 0.32)}
            y1={sy(c.a2.y - c.perp.y * fs * 0.32)}
            x2={sx(c.a2.x + c.perp.x * fs * 0.32)}
            y2={sy(c.a2.y + c.perp.y * fs * 0.32)}
          />
          <line
            x1={sx(c.b2.x - c.perp.x * fs * 0.32)}
            y1={sy(c.b2.y - c.perp.y * fs * 0.32)}
            x2={sx(c.b2.x + c.perp.x * fs * 0.32)}
            y2={sy(c.b2.y + c.perp.y * fs * 0.32)}
          />
          <rect
            x={sx(c.labelPos.x) - c.label.length * fs * 0.32}
            y={sy(c.labelPos.y) - fs * 0.7}
            width={c.label.length * fs * 0.64}
            height={fs * 1.4}
            fill="#fff"
            stroke="none"
            rx={fs * 0.15}
          />
          <text
            x={sx(c.labelPos.x)}
            y={sy(c.labelPos.y)}
            fontSize={fs}
            fill="#1e293b"
            stroke="none"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="system-ui, sans-serif"
            fontWeight={600}
          >
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------

function build(projeto: Projeto) {
  const { pontos, segmentos } = contornoBancada(projeto.bancada);
  const caixa = bbox(pontos);
  const cen = centroide(pontos);
  const span = Math.max(caixa.largura, caixa.altura, 1);
  const fs = span / 20;
  const stroke = Math.max(fs * 0.08, 4);
  const off = span * 0.16;

  const ext = {
    minX: caixa.minX,
    minY: caixa.minY,
    maxX: caixa.maxX,
    maxY: caixa.maxY,
  };
  const expandir = (p: Ponto, pad = 0) => {
    ext.minX = Math.min(ext.minX, p.x - pad);
    ext.minY = Math.min(ext.minY, p.y - pad);
    ext.maxX = Math.max(ext.maxX, p.x + pad);
    ext.maxY = Math.max(ext.maxY, p.y + pad);
  };

  // --- cotas: comprimento de cada trecho + profundidade do trecho 0 ---
  const cotas: Cota[] = [];
  const addCota = (a: Ponto, b: Ponto, dir: Ponto, label: string) => {
    const d = normalizar(dir);
    const a2 = { x: a.x + d.x * off, y: a.y + d.y * off };
    const b2 = { x: b.x + d.x * off, y: b.y + d.y * off };
    const perp = { x: d.y, y: -d.x };
    const labelPos = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
    cotas.push({ a, b, a2, b2, perp, label, labelPos });
    expandir(a2, fs * 1.6);
    expandir(b2, fs * 1.6);
    expandir(labelPos, fs * 1.6);
  };

  projeto.bancada.trechos.forEach((t, i) => {
    const f = frameTrecho(projeto.bancada, i);
    const a = { ...f.origem };
    const b = { x: f.origem.x + f.eixo.x * t.comprimento, y: f.origem.y + f.eixo.y * t.comprimento };
    addCota(a, b, { x: -f.normal.x, y: -f.normal.y }, mmParaCmLabel(t.comprimento));
  });

  {
    const f = frameTrecho(projeto.bancada, 0);
    const t = projeto.bancada.trechos[0];
    const a = { x: f.origem.x + f.eixo.x * t.comprimento, y: f.origem.y + f.eixo.y * t.comprimento };
    const b = { x: a.x + f.normal.x * t.profundidade, y: a.y + f.normal.y * t.profundidade };
    addCota(a, b, { x: f.eixo.x, y: f.eixo.y }, mmParaCmLabel(t.profundidade));
  }

  // --- complementos: linha paralela deslocada para dentro da peça ---
  const comps: LinhaComp[] = [];
  const inset = span * 0.045;
  for (const comp of projeto.complementos) {
    const segs = segmentosDoComplemento(segmentos, comp);
    segs.forEach((s, idx) => {
      const dir = normalizar({ x: s.b.x - s.a.x, y: s.b.y - s.a.y });
      let n = { x: -dir.y, y: dir.x };
      const mid = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
      // aponta para o centro da peça
      if (dist({ x: mid.x + n.x, y: mid.y + n.y }, cen) > dist(mid, cen)) {
        n = { x: -n.x, y: -n.y };
      }
      const a = { x: s.a.x + n.x * inset, y: s.a.y + n.y * inset };
      const b = { x: s.b.x + n.x * inset, y: s.b.y + n.y * inset };
      const primeiro = idx === 0;
      comps.push({
        a,
        b,
        cor: COMP_COR[comp.tipo] ?? "#475569",
        tracejado: comp.tipo === "frontao" || comp.tipo === "rodabanca",
        label: primeiro
          ? `${rotuloComp(comp.tipo)} ${Math.round(comp.altura / 10)}`
          : undefined,
        labelPos: primeiro
          ? { x: (a.x + b.x) / 2 + n.x * inset, y: (a.y + b.y) / 2 + n.y * inset }
          : undefined,
      });
    });
  }

  // recortes já ficam dentro da peça — não precisam expandir ext
  const recortes = projeto.recortes.map((r) => geometriaRecorte(projeto, r));

  return {
    pontos,
    segsParede: segmentos.filter((s) => s.parede),
    recortes,
    cotas,
    comps,
    ext,
    fs,
    stroke,
  };
}

function rotuloComp(t: string): string {
  const m: Record<string, string> = {
    frontao: "Frontão",
    saia: "Saia",
    rodabanca: "Rodabanca",
    soleira: "Soleira",
    pingadeira: "Pingadeira",
  };
  return m[t] ?? t;
}
