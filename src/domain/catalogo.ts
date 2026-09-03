/**
 * Catálogo de pedras. Em produção vem do Supabase (estoque real da DF, com foto
 * de cada chapa que está no galpão). As texturas abaixo são procedurais
 * (ver stoneTexture.ts) — placeholder até as fotos chegarem.
 */
import type { CantoAreaMolhada, Material, TipoRecorte } from "./project";
import { pedraDataURI, type ParamsPedra } from "./stoneTexture";

export type Familia = "Granito" | "Mármore" | "Quartzito" | "Quartzo";

export interface MaterialCatalogo extends Material {
  familia: Familia;
  params: ParamsPedra;
  /** data URI da amostra, gerado do params */
  swatch: string;
}

interface Def {
  id: string;
  nome: string;
  familia: Familia;
  precoM2: number;
  custoM2: number;
  chapa: [number, number];
  params: ParamsPedra;
}

const DEFS: Def[] = [
  // ---------------- Granitos ----------------
  { id: "granito_branco_dallas", nome: "Branco Dallas", familia: "Granito", precoM2: 410, custoM2: 260, chapa: [3200, 1900],
    params: { estilo: "granito", base: "#dedbd2", base2: "#c9c3b4", veio: "#7d7460", intensidade: 1 } },
  { id: "granito_branco_itaunas", nome: "Branco Itaúnas", familia: "Granito", precoM2: 430, custoM2: 270, chapa: [3200, 1900],
    params: { estilo: "granito", base: "#e4e0d6", base2: "#cfc8b8", veio: "#6f6552", intensidade: 1 } },
  { id: "granito_branco_siena", nome: "Branco Siena", familia: "Granito", precoM2: 500, custoM2: 320, chapa: [3100, 1900],
    params: { estilo: "granito", base: "#efe9dd", base2: "#ddd0b8", veio: "#9a6b3f", intensidade: 1 } },
  { id: "granito_cinza_corumba", nome: "Cinza Corumbá", familia: "Granito", precoM2: 360, custoM2: 230, chapa: [3000, 1900],
    params: { estilo: "granito", base: "#b9b9b6", base2: "#9a9a97", veio: "#4a4a48", intensidade: 1.1 } },
  { id: "granito_verde_ubatuba", nome: "Verde Ubatuba", familia: "Granito", precoM2: 460, custoM2: 290, chapa: [3200, 1900],
    params: { estilo: "granito", base: "#2f3a30", base2: "#3d4a3a", veio: "#c9c6a8", intensidade: 1.2 } },
  { id: "granito_amarelo_ornamental", nome: "Amarelo Ornamental", familia: "Granito", precoM2: 370, custoM2: 240, chapa: [3200, 1900],
    params: { estilo: "granito", base: "#d8c28c", base2: "#c2a86a", veio: "#5b4a30", intensidade: 1.1 } },
  { id: "granito_preto_sao_gabriel", nome: "Preto São Gabriel", familia: "Granito", precoM2: 520, custoM2: 330, chapa: [3000, 1900],
    params: { estilo: "granito", base: "#2b2b2e", base2: "#37373b", veio: "#9aa0a6", intensidade: 0.8 } },
  { id: "granito_preto_absoluto", nome: "Preto Absoluto", familia: "Granito", precoM2: 620, custoM2: 400, chapa: [3000, 1900],
    params: { estilo: "granito", base: "#1c1c1e", base2: "#242426", veio: "#3a3a3d", intensidade: 0.5 } },
  { id: "granito_marrom_absoluto", nome: "Marrom Absoluto", familia: "Granito", precoM2: 560, custoM2: 360, chapa: [3000, 1900],
    params: { estilo: "granito", base: "#3a2c24", base2: "#4a382c", veio: "#b79b6b", intensidade: 1 } },
  { id: "granito_vermelho_brasilia", nome: "Vermelho Brasília", familia: "Granito", precoM2: 480, custoM2: 300, chapa: [3100, 1900],
    params: { estilo: "granito", base: "#6e3b34", base2: "#7e463c", veio: "#2a2a2a", intensidade: 1.1 } },
  { id: "granito_cafe_bahia", nome: "Café Bahia", familia: "Granito", precoM2: 540, custoM2: 350, chapa: [3100, 1900],
    params: { estilo: "granito", base: "#4b3a2e", base2: "#5c4738", veio: "#cbb894", intensidade: 1 } },

  // ---------------- Mármores ----------------
  { id: "marmore_carrara", nome: "Carrara", familia: "Mármore", precoM2: 1280, custoM2: 820, chapa: [2800, 1700],
    params: { estilo: "marmore", base: "#eef0f1", base2: "#e2e6e8", veio: "#9aa1a6", intensidade: 0.9 } },
  { id: "marmore_crema_marfil", nome: "Crema Marfil", familia: "Mármore", precoM2: 1080, custoM2: 700, chapa: [2800, 1700],
    params: { estilo: "marmore", base: "#e7ddc7", base2: "#dccfb2", veio: "#a98f63", intensidade: 0.8 } },
  { id: "marmore_nero_marquina", nome: "Nero Marquina", familia: "Mármore", precoM2: 1480, custoM2: 960, chapa: [2700, 1700],
    params: { estilo: "marmore", base: "#1e1e20", base2: "#28282b", veio: "#e9e9e9", intensidade: 1.1 } },
  { id: "marmore_travertino_romano", nome: "Travertino Romano", familia: "Mármore", precoM2: 980, custoM2: 640, chapa: [2600, 1600],
    params: { estilo: "travertino", base: "#ddceb4", base2: "#cdbb9a", veio: "#8a6f49", intensidade: 1 } },
  { id: "marmore_emperador_dark", nome: "Emperador Dark", familia: "Mármore", precoM2: 1220, custoM2: 790, chapa: [2700, 1700],
    params: { estilo: "marmore", base: "#3a2b23", base2: "#48372c", veio: "#c7ab84", intensidade: 1 } },
  { id: "marmore_botticino", nome: "Botticino", familia: "Mármore", precoM2: 1010, custoM2: 660, chapa: [2800, 1700],
    params: { estilo: "marmore", base: "#e8e0cd", base2: "#dccdb0", veio: "#b49b70", intensidade: 0.7 } },

  // ---------------- Quartzitos ----------------
  { id: "quartzito_taj_mahal", nome: "Taj Mahal", familia: "Quartzito", precoM2: 2400, custoM2: 1560, chapa: [3200, 1900],
    params: { estilo: "quartzito", base: "#e6dcc6", base2: "#dccbab", veio: "#a98c5f", intensidade: 0.8 } },
  { id: "quartzito_white_macaubas", nome: "White Macaúbas", familia: "Quartzito", precoM2: 2800, custoM2: 1820, chapa: [3200, 1900],
    params: { estilo: "quartzito", base: "#eef1f2", base2: "#dfe6e9", veio: "#8fa0ab", intensidade: 1 } },
  { id: "quartzito_mont_blanc", nome: "Mont Blanc", familia: "Quartzito", precoM2: 2600, custoM2: 1700, chapa: [3200, 1900],
    params: { estilo: "quartzito", base: "#e9e9e6", base2: "#dadad4", veio: "#8a8f92", intensidade: 0.9 } },
  { id: "quartzito_azul_imperial", nome: "Azul Imperial", familia: "Quartzito", precoM2: 3600, custoM2: 2400, chapa: [3000, 1800],
    params: { estilo: "quartzito", base: "#2f4a63", base2: "#3c5d7c", veio: "#cdd8e0", intensidade: 1.1 } },

  // ---------------- Quartzos (engenharia) ----------------
  { id: "quartzo_branco_stellar", nome: "Branco Stellar", familia: "Quartzo", precoM2: 890, custoM2: 560, chapa: [3060, 1440],
    params: { estilo: "quartzo", base: "#f4f4f0", base2: "#eaeae4", veio: "#c8c8c0", intensidade: 0.5 } },
  { id: "quartzo_cinza_concrete", nome: "Cinza Concrete", familia: "Quartzo", precoM2: 850, custoM2: 540, chapa: [3060, 1440],
    params: { estilo: "quartzo", base: "#9a9a97", base2: "#8c8c89", veio: "#6a6a67", intensidade: 0.6 } },
  { id: "quartzo_nero", nome: "Nero", familia: "Quartzo", precoM2: 900, custoM2: 570, chapa: [3060, 1440],
    params: { estilo: "quartzo", base: "#232326", base2: "#2c2c30", veio: "#4a4a4e", intensidade: 0.5 } },
  { id: "quartzo_calacatta", nome: "Calacatta", familia: "Quartzo", precoM2: 1120, custoM2: 720, chapa: [3250, 1600],
    params: { estilo: "marmore", base: "#f1f0ec", base2: "#e7e4dc", veio: "#b49a6a", intensidade: 0.9 } },
];

export const MATERIAIS: MaterialCatalogo[] = DEFS.map((d) => ({
  id: d.id,
  nome: `${d.familia}s ${d.nome}`,
  familia: d.familia,
  texturaUrl: `/chapas/${d.id}.jpg`,
  precoM2: d.precoM2,
  custoM2: d.custoM2,
  chapa: { largura: d.chapa[0], altura: d.chapa[1] },
  params: d.params,
  swatch: pedraDataURI(d.params, 128),
}));

export const FAMILIAS: Familia[] = ["Granito", "Mármore", "Quartzito", "Quartzo"];

export function materialPorId(id: string | undefined): MaterialCatalogo | undefined {
  return MATERIAIS.find((m) => m.id === id);
}

export interface ModeloCuba {
  id: string;
  nome: string;
  tipo: Extract<TipoRecorte, "cuba_embutir" | "cuba_sobrepor">;
  largura: number;
  profundidade: number;
}

export const CUBAS: ModeloCuba[] = [
  { id: "cuba_inox_56x34", nome: "Inox 56 × 34", tipo: "cuba_embutir", largura: 560, profundidade: 340 },
  { id: "cuba_inox_50x40", nome: "Inox 50 × 40", tipo: "cuba_embutir", largura: 500, profundidade: 400 },
  { id: "cuba_inox_46x30", nome: "Inox 46 × 30", tipo: "cuba_embutir", largura: 460, profundidade: 300 },
  { id: "cuba_inox_40x34", nome: "Inox 40 × 34", tipo: "cuba_embutir", largura: 400, profundidade: 340 },
  { id: "cuba_inox_dupla_80x40", nome: "Inox dupla 80 × 40", tipo: "cuba_embutir", largura: 800, profundidade: 400 },
  { id: "cuba_louca_sobrepor_50x38", nome: "Louça sobrepor 50 × 38", tipo: "cuba_sobrepor", largura: 500, profundidade: 380 },
  { id: "cuba_louca_sobrepor_oval", nome: "Louça sobrepor oval 45 × 33", tipo: "cuba_sobrepor", largura: 450, profundidade: 330 },
];

export const CANTO_AREA_MOLHADA_LABEL: Record<CantoAreaMolhada, string> = {
  retangular: "Retangular",
  arredondado: "Canto arredondado",
  oval: "Oval",
};
