/**
 * Textura de pedra procedural — placeholder até chegarem as fotos reais das
 * chapas (especificação, seção 6). A MESMA função desenha a amostra da lista
 * e o mapa aplicado na peça 3D, então lista e 3D sempre batem.
 */

export type EstiloPedra =
  | "granito"
  | "marmore"
  | "quartzo"
  | "quartzito"
  | "travertino";

export interface ParamsPedra {
  estilo: EstiloPedra;
  /** cor de fundo */
  base: string;
  /** manchas/segunda cor (opcional) */
  base2?: string;
  /** cor dos veios */
  veio: string;
  /** 0.4 a 1.6 — densidade do granulado / intensidade dos veios */
  intensidade?: number;
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex(c: string): [number, number, number] {
  const m = c.replace("#", "");
  const n =
    m.length === 3
      ? m.split("").map((x) => x + x).join("")
      : m.padEnd(6, "0");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

/** PRNG determinístico simples para a textura ser estável entre renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedFrom(p: ParamsPedra): number {
  let h = 2166136261;
  const str = p.estilo + p.base + (p.base2 ?? "") + p.veio;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Desenha a pedra no contexto 2D dado, ocupando size×size. */
export function desenharPedra(
  ctx: CanvasRenderingContext2D,
  size: number,
  p: ParamsPedra,
): void {
  const rnd = rng(seedFrom(p));
  const I = p.intensidade ?? 1;

  ctx.fillStyle = p.base;
  ctx.fillRect(0, 0, size, size);

  // manchas suaves da segunda cor
  if (p.base2) {
    for (let i = 0; i < 6; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = size * (0.25 + rnd() * 0.4);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, mix(p.base, p.base2, 0.7));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
  }

  if (p.estilo === "granito" || p.estilo === "quartzo") {
    const n = Math.round((p.estilo === "granito" ? 5200 : 2600) * I);
    for (let i = 0; i < n; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const rad = (p.estilo === "granito" ? 1.6 : 1.0) * (0.3 + rnd() * 1.2) * (size / 512);
      const d = (rnd() - 0.5) * (p.estilo === "granito" ? 0.9 : 0.4);
      const c = d < 0 ? mix(p.base, "#000000", -d) : mix(p.base, "#ffffff", d);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (p.estilo === "travertino") {
    // bandas horizontais + poros
    for (let i = 0; i < 22; i++) {
      const y = rnd() * size;
      ctx.strokeStyle = mix(p.base, p.veio, 0.35 * I);
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = (1 + rnd() * 3) * (size / 512);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += size / 8) {
        ctx.lineTo(x, y + (rnd() - 0.5) * 6);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 260 * I; i++) {
      ctx.fillStyle = mix(p.base, "#000000", 0.25);
      ctx.globalAlpha = 0.3;
      const x = rnd() * size;
      const y = rnd() * size;
      ctx.beginPath();
      ctx.ellipse(x, y, (1 + rnd() * 2) * (size / 512), (0.6 + rnd()) * (size / 512), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (p.estilo === "marmore" || p.estilo === "quartzito") {
    const veios = Math.round((p.estilo === "quartzito" ? 7 : 5) * I);
    for (let v = 0; v < veios; v++) {
      const vertical = rnd() > 0.5;
      const start = rnd() * size;
      const pts: [number, number][] = [];
      const passos = 10;
      for (let i = 0; i <= passos; i++) {
        const t = (i / passos) * size;
        const wob = (rnd() - 0.5) * size * 0.28;
        pts.push(vertical ? [start + wob, t] : [t, start + wob]);
      }
      // passadas: halo largo difuso, veio médio, fio fino — tudo com blur
      const passadas = [
        { w: 14 * (size / 512), col: mix(p.base, p.veio, 0.18), a: 0.4, blur: 6 },
        { w: 5 * (size / 512), col: mix(p.veio, p.base, 0.4), a: 0.4, blur: 2.5 },
        { w: 1.6 * (size / 512), col: mix(p.veio, p.base, 0.1), a: 0.45, blur: 1 },
      ];
      for (const pass of passadas) {
        ctx.strokeStyle = pass.col;
        ctx.globalAlpha = pass.a * Math.min(I, 1.2);
        ctx.lineWidth = pass.w;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.filter = `blur(${pass.blur * (size / 512)}px)`;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2;
          const my = (pts[i][1] + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        }
        ctx.stroke();
        // ramificações finas
        if (pass.w < 3 && rnd() > 0.35) {
          const k = Math.floor(rnd() * (pts.length - 2)) + 1;
          ctx.beginPath();
          ctx.moveTo(pts[k][0], pts[k][1]);
          ctx.lineTo(
            pts[k][0] + (rnd() - 0.5) * size * 0.22,
            pts[k][1] + (rnd() - 0.5) * size * 0.22,
          );
          ctx.stroke();
        }
      }
      ctx.filter = "none";
    }
    ctx.globalAlpha = 1;
  }

  // grão fino por cima, une tudo
  const n2 = Math.round(2200 * I);
  for (let i = 0; i < n2; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = rnd() > 0.5 ? "#ffffff" : "#000000";
    ctx.globalAlpha = 0.03;
    ctx.fillRect(x, y, size / 512, size / 512);
  }
  ctx.globalAlpha = 1;
}

let _cache: Map<string, string> | null = null;

/** Data URI (PNG) da amostra, memoizado por parâmetros. */
export function pedraDataURI(p: ParamsPedra, size = 128): string {
  const key = `${size}|${p.estilo}|${p.base}|${p.base2 ?? ""}|${p.veio}|${p.intensidade ?? 1}`;
  _cache ??= new Map();
  const hit = _cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return p.base;
  desenharPedra(ctx, size, p);
  const uri = c.toDataURL("image/png");
  _cache.set(key, uri);
  return uri;
}
