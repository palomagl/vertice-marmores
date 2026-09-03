import type {
  Ambiente,
  AcabamentoBorda,
  Bancada,
  Formato,
  Projeto,
} from "./project";

/** Defaults que economizam digitação (especificação, seção 4). Tudo em mm. */
export const DEFAULTS = {
  profundidadeCozinha: 600,
  profundidadeBanheiro: 550,
  alturaInstalacao: 900,
  espessura: 20,
  espessuraOpcional: 30,
  frontao: 100,
  saia: 80,
} as const;

export const ACABAMENTO_PADRAO: AcabamentoBorda = {
  tipo: "reto",
  precoMetroLinear: 4500, // centavos? não — R$. Editável no admin.
};

/** Rótulos de formato — nomenclatura do mercado (seção 4). */
export const FORMATO_LABEL: Record<Formato, string> = {
  linear: "Linear",
  L: "Em L",
  P: "Em P",
  U: "Em U",
  personalizado: "Personalizado",
};

export const AMBIENTE_LABEL: Record<Ambiente, string> = {
  pia: "Pia",
  gourmet: "Gourmet",
  banheiro: "Banheiro",
  ilha: "Ilha",
  balcao: "Balcão",
  lavanderia: "Lavanderia",
};

interface PresetAmbiente {
  formato: Formato;
  profundidade: number;
  /** todas as bordas acabadas (ilha) */
  todasBordasAcabadas: boolean;
  /** já nasce com frontão */
  comFrontao: boolean;
  /** já nasce com saia nos lados */
  comSaia: boolean;
  descricao: string;
}

/**
 * "Ambientes" é a sacada que vale roubar (seção 4.1):
 * o vendedor escolhe o tipo de serviço e o app carrega os defaults certos.
 */
export const PRESETS: Record<Ambiente, PresetAmbiente> = {
  pia: {
    formato: "linear",
    profundidade: DEFAULTS.profundidadeCozinha,
    todasBordasAcabadas: false,
    comFrontao: true,
    comSaia: false,
    descricao: "Pia de cozinha encostada na parede, com frontão.",
  },
  gourmet: {
    formato: "L",
    profundidade: DEFAULTS.profundidadeCozinha,
    todasBordasAcabadas: false,
    comFrontao: true,
    comSaia: false,
    descricao: "Bancada gourmet em L, com frontão.",
  },
  banheiro: {
    formato: "linear",
    profundidade: DEFAULTS.profundidadeBanheiro,
    todasBordasAcabadas: false,
    comFrontao: false,
    comSaia: true,
    descricao: "Bancada de banheiro, 55 cm, com saia frontal.",
  },
  ilha: {
    formato: "linear",
    profundidade: 900,
    todasBordasAcabadas: true,
    comFrontao: false,
    comSaia: true,
    descricao: "Ilha central: 4 bordas acabadas e saia nos lados.",
  },
  balcao: {
    formato: "linear",
    profundidade: 400,
    todasBordasAcabadas: true,
    comFrontao: false,
    comSaia: false,
    descricao: "Balcão / bancada de apoio, bordas acabadas.",
  },
  lavanderia: {
    formato: "linear",
    profundidade: 550,
    todasBordasAcabadas: false,
    comFrontao: true,
    comSaia: false,
    descricao: "Bancada de lavanderia sobre o tanque, com frontão.",
  },
};

/** Trechos default para cada formato, usando a profundidade do preset. */
export function trechosPadrao(formato: Formato, profundidade: number): Bancada["trechos"] {
  switch (formato) {
    case "linear":
      return [{ comprimento: 2000, profundidade }];
    case "L":
    case "P":
      return [
        { comprimento: 2200, profundidade },
        { comprimento: 1800, profundidade },
      ];
    case "U":
      return [
        { comprimento: 1800, profundidade },
        { comprimento: 2400, profundidade },
        { comprimento: 1800, profundidade },
      ];
    case "personalizado":
      return [{ comprimento: 2000, profundidade }];
  }
}

function novoId(prefixo: string): string {
  return `${prefixo}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Cria um Projeto em branco já com os defaults do ambiente escolhido. */
export function projetoNovo(ambiente: Ambiente = "pia"): Projeto {
  const preset = PRESETS[ambiente];
  const agora = new Date().toISOString();
  return {
    id: novoId("proj"),
    nome: "",
    ambiente,
    cliente: { nome: "", telefone: "" },
    criadoEm: agora,
    atualizadoEm: agora,
    bancada: {
      formato: preset.formato,
      trechos: trechosPadrao(preset.formato, preset.profundidade),
      espessura: DEFAULTS.espessura,
      alturaInstalacao: DEFAULTS.alturaInstalacao,
    },
    material: null,
    recortes: [],
    complementos: [
      ...(preset.comFrontao
        ? [{ id: novoId("cmp"), tipo: "frontao" as const, altura: DEFAULTS.frontao, lado: "traseiro" as const, trechos: [] }]
        : []),
      ...(preset.comSaia
        ? [{ id: novoId("cmp"), tipo: "saia" as const, altura: DEFAULTS.saia, lado: "frontal" as const, trechos: [] }]
        : []),
    ],
    acabamentoBorda: { ...ACABAMENTO_PADRAO },
    sync: "local",
  };
}

export { novoId };
