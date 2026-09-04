/**
 * O MODELO DE DADOS ÚNICO (especificação, seção 3).
 *
 * O desenho 2D, o 3D, o AR, o PDF e o orçamento são TODOS views deste objeto.
 * Nunca guarde coordenada de tela aqui. Nunca use float para medida.
 * Toda medida é milímetro inteiro.
 */

export type Formato = "linear" | "L" | "P" | "U" | "personalizado";

export type Ambiente =
  | "pia"
  | "gourmet"
  | "banheiro"
  | "ilha"
  | "balcao"
  | "lavanderia";

/** Um segmento reto da bancada. Bancada de marmoraria é retilínea, 90°. */
export interface Trecho {
  /** comprimento ao longo do eixo do trecho, mm */
  comprimento: number;
  /** profundidade (largura da bancada), mm */
  profundidade: number;
}

export interface Bancada {
  formato: Formato;
  /**
   * linear: [A]
   * L / P:  [A, B]
   * U:      [A, B, C]  (A e C = braços laterais, B = base)
   */
  trechos: Trecho[];
  /** espessura da pedra, mm. 20 padrão, 30 opção. */
  espessura: number;
  /** altura do piso até o tampo, mm. 900 padrão. */
  alturaInstalacao: number;
}

export interface Material {
  id: string;
  nome: string;
  /** foto da chapa real do estoque; UV esticado na peça inteira (seção 6) */
  texturaUrl: string;
  precoM2: number;
  /** custo interno — nunca vai para a proposta do cliente */
  custoM2?: number;
  /** tamanho da chapa entregue pelo fornecedor, mm (seção 9) */
  chapa: { largura: number; altura: number };
}

export type TipoRecorte =
  | "area_molhada" // "cuba esculpida" no vocabulário do setor
  | "cuba_embutir"
  | "cuba_sobrepor"
  | "cooktop"
  | "furo_torneira"
  | "furo_dosador";

export type CantoAreaMolhada = "retangular" | "arredondado" | "oval";

export interface PosicaoRecorte {
  /** índice do trecho onde o recorte fica */
  trecho: number;
  /** distância da borda inicial do trecho até o começo do recorte, mm */
  distanciaInicio: number;
  /** se true, ignora distanciaInicio e centraliza no comprimento do trecho */
  centralizada: boolean;
  /** distância da borda frontal até o recorte, mm. undefined = centraliza na profundidade */
  recuoFrontal?: number;
}

export interface Recorte {
  id: string;
  tipo: TipoRecorte;
  /** modelo do catálogo, ex: "cuba_inox_56x34" */
  modelo?: string;
  largura: number;
  profundidade: number;
  /** furos: diâmetro em mm (largura/profundidade ignorados) */
  diametro?: number;
  /** só para area_molhada */
  canto?: CantoAreaMolhada;
  posicao: PosicaoRecorte;
}

export type TipoComplemento =
  | "frontao"
  | "saia"
  | "rodabanca"
  | "soleira"
  | "pingadeira";

/** Lado da bancada para posicionar frontão / saia. */
export type Lado = "frontal" | "traseiro" | "esquerdo" | "direito";

export interface Complemento {
  id: string;
  tipo: TipoComplemento;
  /**
   * altura da aba, mm.
   * REGRA v1: o preço do complemento (quote.ts) é linear (R$/m) e NÃO usa esta
   * altura. Ok para saia de ~8 cm; subestima o painel de ilha que desce até o
   * piso. Pendente de confirmação da marmoraria — ver quote.test.ts.
   */
  altura: number;
  /** lado da peça (frontão/saia). Quando ausente, cai no comportamento por trecho. */
  lado?: Lado;
  /** reforço estrutural da aba */
  reforco?: boolean;
  /** índices dos trechos que recebem o complemento (quando não usa `lado`) */
  trechos: number[];
}

export type TipoAcabamentoBorda =
  | "reto"
  | "boleado"
  | "meia_cana"
  | "bisote"
  | "meia_esquadria";

export interface AcabamentoBorda {
  tipo: TipoAcabamentoBorda;
  precoMetroLinear: number;
}

export interface Cliente {
  nome: string;
  telefone: string;
  endereco?: string;
}

export type EstadoSync = "local" | "sincronizado";

export interface Projeto {
  id: string;
  /** número sequencial da proposta, atribuído no envio: "2026-0142" */
  numero?: string;
  nome: string;
  ambiente: Ambiente;
  cliente: Cliente;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
  bancada: Bancada;
  material: Material | null;
  recortes: Recorte[];
  complementos: Complemento[];
  acabamentoBorda: AcabamentoBorda;
  /**
   * distância até o local de entrega, km inteiro.
   * undefined = não informado → frete "a combinar", fora do total.
   * 0 = retirada na loja → frete R$ 0, dentro do total.
   */
  distanciaKm?: number;
  observacoes?: string;
  sync: EstadoSync;
  /** ISO da última vez que este projeto entrou num backup .json. undefined = nunca exportado. */
  exportadoEm?: string;
}
