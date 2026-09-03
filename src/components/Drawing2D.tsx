/**
 * Renderizador 2D — SVG puro derivado do modelo (especificação, seção 4.1).
 * Nunca guarda coordenada de tela: tudo é calculado a partir do Projeto.
 * O mesmo SVG entra inline na proposta e imprime vetorial (seção 10).
 */
import { useMemo } from "react";
import {
  bbox,
  contornoBancada,
  frameTrecho,
  geometriaRecorte,
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

export function Drawing2D({ projeto, cor = "#d8d8d5", className }: Props) {
  const { pontos, segs, caixa, pad, fs, recortes } = useMemo(() => {
    const { pontos, segmentos } = contornoBancada(projeto.bancada);
    const caixa = bbox(pontos);
    const span = Math.max(caixa.largura, caixa.altura, 1);
    const pad = span * 0.16;
    const fs = span / 26;
    const recortes = projeto.recortes.map((r) => geometriaRecorte(projeto, r));
    return { pontos, segs: segmentos, caixa, pad, fs, recortes };
  }, [projeto]);

  // mm-space -> SVG-space: origem no canto sup-esq, y do "fundo" para cima da tela
  const sx = (x: number) => x - caixa.minX + pad;
  const sy = (y: number) => caixa.maxY - y + pad;
  const P = (p: Ponto) => `${sx(p.x)},${sy(p.y)}`;

  const w = caixa.largura + pad * 2;
  const h = caixa.altura + pad * 2;
  const outline = pontos.map(P).join(" ");
  const stroke = Math.max(fs * 0.09, 4);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* peça */}
      <polygon
        points={outline}
        fill={cor}
        stroke="#3a3a3a"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />

      {/* bordas que encostam na parede: hachura leve */}
      {segs
        .filter((s) => s.parede)
        .map((s, i) => (
          <line
            key={`w${i}`}
            x1={sx(s.a.x)}
            y1={sy(s.a.y)}
            x2={sx(s.b.x)}
            y2={sy(s.b.y)}
            stroke="#9aa0a6"
            strokeWidth={stroke * 2.2}
            strokeDasharray={`${fs * 0.5} ${fs * 0.35}`}
          />
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
        const rx =
          r.tipo === "area_molhada" && r.canto === "arredondado" ? fs * 0.6 : 0;
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
            points={g.cantos.map(P).join(" ")}
            fill="#fff"
            stroke="#c0392b"
            strokeWidth={stroke}
            rx={rx}
          />
        );
      })}

      {/* cotas por trecho */}
      {projeto.bancada.trechos.map((t, i) => {
        const f = frameTrecho(projeto.bancada, i);
        const a: Ponto = { x: f.origem.x, y: f.origem.y };
        const b: Ponto = {
          x: f.origem.x + f.eixo.x * t.comprimento,
          y: f.origem.y + f.eixo.y * t.comprimento,
        };
        // desloca a cota para "fora" da peça (contra a normal)
        const off = pad * 0.55 * (i === 0 ? 1 : 0.8);
        return (
          <Cota
            key={`c${i}`}
            a={a}
            b={b}
            dir={{ x: -f.normal.x, y: -f.normal.y }}
            off={off}
            label={mmParaCmLabel(t.comprimento)}
            sx={sx}
            sy={sy}
            fs={fs}
          />
        );
      })}

      {/* cota de profundidade no trecho 0 */}
      {(() => {
        const f = frameTrecho(projeto.bancada, 0);
        const t = projeto.bancada.trechos[0];
        const a: Ponto = { x: f.origem.x, y: f.origem.y };
        const b: Ponto = {
          x: f.origem.x + f.normal.x * t.profundidade,
          y: f.origem.y + f.normal.y * t.profundidade,
        };
        return (
          <Cota
            a={a}
            b={b}
            dir={{ x: -f.eixo.x, y: -f.eixo.y }}
            off={pad * 0.55}
            label={mmParaCmLabel(t.profundidade)}
            sx={sx}
            sy={sy}
            fs={fs}
          />
        );
      })()}
    </svg>
  );
}

interface CotaProps {
  a: Ponto;
  b: Ponto;
  /** direção (unitária, mm-space) para onde a linha de cota se afasta da peça */
  dir: Ponto;
  off: number;
  label: string;
  sx: (x: number) => number;
  sy: (y: number) => number;
  fs: number;
}

function Cota({ a, b, dir, off, label, sx, sy, fs }: CotaProps) {
  const a2 = { x: a.x + dir.x * off, y: a.y + dir.y * off };
  const b2 = { x: b.x + dir.x * off, y: b.y + dir.y * off };
  const mid = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
  const sw = Math.max(fs * 0.05, 2);
  const tick = fs * 0.35;
  // perpendicular para os ticks
  const perp = { x: dir.y, y: -dir.x };

  return (
    <g stroke="#1e293b" strokeWidth={sw} fill="none">
      {/* linhas de chamada */}
      <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(a2.x)} y2={sy(a2.y)} strokeDasharray={`${tick} ${tick}`} opacity={0.5} />
      <line x1={sx(b.x)} y1={sy(b.y)} x2={sx(b2.x)} y2={sy(b2.y)} strokeDasharray={`${tick} ${tick}`} opacity={0.5} />
      {/* linha de cota */}
      <line x1={sx(a2.x)} y1={sy(a2.y)} x2={sx(b2.x)} y2={sy(b2.y)} />
      {/* ticks nas pontas */}
      <line x1={sx(a2.x - perp.x * tick)} y1={sy(a2.y - perp.y * tick)} x2={sx(a2.x + perp.x * tick)} y2={sy(a2.y + perp.y * tick)} />
      <line x1={sx(b2.x - perp.x * tick)} y1={sy(b2.y - perp.y * tick)} x2={sx(b2.x + perp.x * tick)} y2={sy(b2.y + perp.y * tick)} />
      {/* texto */}
      <rect
        x={sx(mid.x) - label.length * fs * 0.31}
        y={sy(mid.y) - fs * 0.7}
        width={label.length * fs * 0.62}
        height={fs * 1.4}
        fill="#fff"
        stroke="none"
        rx={fs * 0.15}
      />
      <text
        x={sx(mid.x)}
        y={sy(mid.y)}
        fontSize={fs}
        fill="#1e293b"
        stroke="none"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="system-ui, sans-serif"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}
