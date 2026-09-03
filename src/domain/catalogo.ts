/**
 * Catálogo de exemplo. Em produção vem do Supabase (estoque real da DF, com
 * foto de cada chapa que está no galpão hoje — ver especificação, seção 6).
 * As cores abaixo são placeholders até as fotos chegarem.
 */
import type { CantoAreaMolhada, Material, TipoRecorte } from "./project";

export interface MaterialCatalogo extends Material {
  /** cor de fallback enquanto não há foto da chapa */
  corFallback: string;
}

export const MATERIAIS: MaterialCatalogo[] = [
  {
    id: "granito_branco_paraiso",
    nome: "Granito Branco Paraíso",
    texturaUrl: "/chapas/branco-paraiso.jpg",
    corFallback: "#e8e4dc",
    precoM2: 480,
    custoM2: 300,
    chapa: { largura: 3200, altura: 1900 },
  },
  {
    id: "granito_preto_sao_gabriel",
    nome: "Granito Preto São Gabriel",
    texturaUrl: "/chapas/preto-sao-gabriel.jpg",
    corFallback: "#2b2b2e",
    precoM2: 520,
    custoM2: 330,
    chapa: { largura: 3000, altura: 1900 },
  },
  {
    id: "quartzo_branco_stellar",
    nome: "Quartzo Branco Stellar",
    texturaUrl: "/chapas/branco-stellar.jpg",
    corFallback: "#f4f4f0",
    precoM2: 890,
    custoM2: 560,
    chapa: { largura: 3060, altura: 1440 },
  },
  {
    id: "marmore_carrara",
    nome: "Mármore Carrara",
    texturaUrl: "/chapas/carrara.jpg",
    corFallback: "#eceef0",
    precoM2: 760,
    custoM2: 470,
    chapa: { largura: 2800, altura: 1700 },
  },
  {
    id: "granito_verde_ubatuba",
    nome: "Granito Verde Ubatuba",
    texturaUrl: "/chapas/verde-ubatuba.jpg",
    corFallback: "#2f3a30",
    precoM2: 460,
    custoM2: 290,
    chapa: { largura: 3200, altura: 1900 },
  },
  {
    id: "quartzo_cinza_concrete",
    nome: "Quartzo Cinza Concrete",
    texturaUrl: "/chapas/cinza-concrete.jpg",
    corFallback: "#9a9a97",
    precoM2: 850,
    custoM2: 540,
    chapa: { largura: 3060, altura: 1440 },
  },
];

export interface ModeloCuba {
  id: string;
  nome: string;
  tipo: Extract<TipoRecorte, "cuba_embutir" | "cuba_sobrepor">;
  largura: number;
  profundidade: number;
}

export const CUBAS: ModeloCuba[] = [
  { id: "cuba_inox_56x34", nome: "Inox 56 × 34", tipo: "cuba_embutir", largura: 560, profundidade: 340 },
  { id: "cuba_inox_46x30", nome: "Inox 46 × 30", tipo: "cuba_embutir", largura: 460, profundidade: 300 },
  { id: "cuba_inox_40x34", nome: "Inox 40 × 34", tipo: "cuba_embutir", largura: 400, profundidade: 340 },
  { id: "cuba_louca_sobrepor", nome: "Louça sobrepor 50 × 38", tipo: "cuba_sobrepor", largura: 500, profundidade: 380 },
];

export const CANTO_AREA_MOLHADA_LABEL: Record<CantoAreaMolhada, string> = {
  retangular: "Retangular",
  arredondado: "Canto arredondado",
  oval: "Oval",
};
