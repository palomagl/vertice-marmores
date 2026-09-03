/**
 * Tabela de preços — tela de admin (especificação, seção 9).
 * Tudo editável pelo dono, sem mexer em código. Este objeto é só o DEFAULT
 * de fábrica; em produção vem do Supabase (tabela `tabela_precos` da empresa).
 */
import type {
  TipoAcabamentoBorda,
  TipoComplemento,
  TipoRecorte,
} from "./project";

export interface DadosEmpresa {
  nome: string;
  cnpj: string;
  telefone: string;
  cidade: string;
  prazoEntrega: string;
  formaPagamento: string;
  validadeDias: number;
}

export interface TabelaPrecos {
  /** dados que aparecem na proposta e na ordem de serviço */
  empresa: DadosEmpresa;
  /** R$/m linear por tipo de acabamento de borda */
  acabamentoBorda: Record<TipoAcabamentoBorda, number>;
  /** R$ por unidade, valor fixo por tipo de recorte */
  recorte: Record<TipoRecorte, number>;
  /** R$/m linear por tipo de complemento (multiplicado pelo comprimento do trecho) */
  complemento: Record<TipoComplemento, number>;
  /** instalação */
  instalacao: {
    /** R$ fixo por serviço */
    fixo: number;
    /** + R$/m² */
    porM2: number;
  };
  /** frete por faixa de distância (km) */
  frete: { ateKm: number; valor: number }[];
  /**
   * Fator de aproveitamento da chapa (seção 9). A peça consome o RETÂNGULO
   * ENVOLVENTE, não a área desenhada; este fator cobre o retalho perdido.
   * 1.0 = sem perda extra além do retângulo. 1.15 = +15%.
   */
  fatorAproveitamento: number;
  /** margem mínima aceitável (%) e desconto máximo do vendedor (%) */
  margemMinimaPct: number;
  descontoMaximoPct: number;
}

export const TABELA_PADRAO: TabelaPrecos = {
  empresa: {
    nome: "DF Mármores e Granitos",
    cnpj: "",
    telefone: "",
    cidade: "",
    prazoEntrega: "A combinar",
    formaPagamento: "A combinar",
    validadeDias: 15,
  },
  acabamentoBorda: {
    reto: 45,
    boleado: 70,
    meia_cana: 85,
    bisote: 90,
    meia_esquadria: 120,
  },
  recorte: {
    area_molhada: 350, // cuba esculpida — mão de obra alta
    cuba_embutir: 90,
    cuba_sobrepor: 60,
    cooktop: 80,
    furo_torneira: 25,
    furo_dosador: 25,
  },
  complemento: {
    frontao: 120,
    saia: 150,
    rodabanca: 110,
    soleira: 130,
    pingadeira: 40,
  },
  instalacao: { fixo: 250, porM2: 0 },
  frete: [
    { ateKm: 15, valor: 80 },
    { ateKm: 40, valor: 160 },
    { ateKm: 80, valor: 320 },
  ],
  fatorAproveitamento: 1.0,
  margemMinimaPct: 25,
  descontoMaximoPct: 10,
};
