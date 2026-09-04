import type {
  Ambiente,
  AcabamentoBorda,
  Bancada,
  CantoAreaMolhada,
  Complemento,
  Formato,
  Lado,
  Projeto,
  Recorte,
  TipoRecorte,
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
  precoMetroLinear: 4500,
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

/**
 * Nome derivado do projeto — nunca vazio (seção 5 do pedido).
 *   "Julia — Pia · 03/09"        quando há cliente
 *   "Simulação — Pia · 03/09"    sem cliente
 */
export function nomeProjetoPadrao(
  clienteNome: string,
  ambiente: Ambiente,
  dataISO: string,
): string {
  const d = new Date(dataISO);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const quem = clienteNome.trim() || "Simulação";
  return `${quem} — ${AMBIENTE_LABEL[ambiente]} · ${dd}/${mm}`;
}

interface RecorteSeed {
  tipo: TipoRecorte;
  largura: number;
  profundidade: number;
  diametro?: number;
  canto?: CantoAreaMolhada;
  modelo?: string;
  centralizada?: boolean;
  distanciaInicio?: number;
  recuoFrontal?: number;
}

interface PresetAmbiente {
  formato: Formato;
  profundidade: number;
  /** todas as bordas acabadas (ilha, balcão) */
  todasBordasAcabadas: boolean;
  /** lados que nascem com frontão */
  frontaoLados: Lado[];
  frontaoAltura: number;
  /** lados que nascem com saia */
  saiaLados: Lado[];
  /** altura da saia em mm, ou "piso" = painel até o chão (ilha) */
  saiaAltura: number | "piso";
  /** recortes que já vêm no ambiente */
  recortes: RecorteSeed[];
  descricao: string;
}

const CUBA_COZINHA: RecorteSeed = {
  tipo: "cuba_embutir",
  modelo: "cuba_inox_56x34",
  largura: 560,
  profundidade: 340,
  canto: "retangular",
  centralizada: true,
};

/**
 * "Ambientes" é a sacada que vale roubar (seção 4.1): o vendedor escolhe o tipo
 * de serviço e o app já monta o FORMATO certo — pia com furo, ilha com laterais
 * até o piso, etc.
 */
export const PRESETS: Record<Ambiente, PresetAmbiente> = {
  pia: {
    formato: "linear",
    profundidade: DEFAULTS.profundidadeCozinha,
    todasBordasAcabadas: false,
    frontaoLados: ["traseiro"],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [{ ...CUBA_COZINHA, centralizada: false, distanciaInicio: 350 }],
    descricao: "Pia de cozinha na parede: cuba e frontão.",
  },
  gourmet: {
    formato: "L",
    profundidade: DEFAULTS.profundidadeCozinha,
    todasBordasAcabadas: false,
    frontaoLados: ["traseiro"],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [
      { ...CUBA_COZINHA, centralizada: false, distanciaInicio: 300 },
      { tipo: "cooktop", largura: 580, profundidade: 500, centralizada: false, distanciaInicio: 1200 },
    ],
    descricao: "Bancada gourmet em L, com cuba, cooktop e frontão.",
  },
  banheiro: {
    formato: "linear",
    profundidade: DEFAULTS.profundidadeBanheiro,
    todasBordasAcabadas: false,
    frontaoLados: [],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: ["frontal"],
    saiaAltura: 120,
    recortes: [
      {
        tipo: "cuba_embutir",
        modelo: "cuba_inox_46x30",
        largura: 460,
        profundidade: 300,
        canto: "arredondado",
        centralizada: true,
      },
    ],
    descricao: "Bancada de banheiro, 55 cm, com cuba e saia frontal.",
  },
  ilha: {
    formato: "linear",
    profundidade: 900,
    todasBordasAcabadas: true,
    frontaoLados: [],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: ["esquerdo", "direito"],
    saiaAltura: "piso",
    recortes: [{ ...CUBA_COZINHA, centralizada: true }],
    descricao: "Ilha central: laterais em pedra até o piso.",
  },
  balcao: {
    formato: "linear",
    profundidade: 400,
    todasBordasAcabadas: true,
    frontaoLados: [],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [],
    descricao: "Balcão / bancada de apoio, bordas acabadas.",
  },
  lavanderia: {
    formato: "linear",
    profundidade: 550,
    todasBordasAcabadas: false,
    frontaoLados: ["traseiro"],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [
      {
        tipo: "cuba_embutir",
        modelo: "cuba_inox_50x40",
        largura: 500,
        profundidade: 400,
        canto: "retangular",
        centralizada: true,
      },
    ],
    descricao: "Bancada de lavanderia sobre o tanque, com cuba e frontão.",
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

/**
 * Monta bancada + complementos + recortes de um ambiente. Usado tanto ao criar
 * projeto novo quanto ao trocar de ambiente no configurador.
 */
export function montarAmbiente(
  ambiente: Ambiente,
  espessura: number,
  alturaInstalacao: number,
): {
  formato: Formato;
  trechos: Bancada["trechos"];
  complementos: Complemento[];
  recortes: Recorte[];
} {
  const preset = PRESETS[ambiente];
  const trechos = trechosPadrao(preset.formato, preset.profundidade);

  const alturaSaia =
    preset.saiaAltura === "piso"
      ? Math.max(alturaInstalacao - espessura, 300)
      : preset.saiaAltura;

  const complementos: Complemento[] = [
    ...preset.frontaoLados.map((lado) => ({
      id: novoId("cmp"),
      tipo: "frontao" as const,
      altura: preset.frontaoAltura,
      lado,
      trechos: [],
    })),
    ...preset.saiaLados.map((lado) => ({
      id: novoId("cmp"),
      tipo: "saia" as const,
      altura: alturaSaia,
      lado,
      trechos: [],
    })),
  ];

  const recortes: Recorte[] = preset.recortes.map((s) => ({
    id: novoId("rec"),
    tipo: s.tipo,
    modelo: s.modelo,
    largura: s.largura,
    profundidade: s.profundidade,
    diametro: s.diametro,
    canto: s.canto,
    posicao: {
      trecho: 0,
      distanciaInicio: s.distanciaInicio ?? 0,
      centralizada: s.centralizada ?? false,
      recuoFrontal: s.recuoFrontal,
    },
  }));

  return { formato: preset.formato, trechos, complementos, recortes };
}

/** Cria um Projeto em branco já com os defaults do ambiente escolhido. */
export function projetoNovo(ambiente: Ambiente = "pia"): Projeto {
  const agora = new Date().toISOString();
  const espessura = DEFAULTS.espessura;
  const alturaInstalacao = DEFAULTS.alturaInstalacao;
  const { formato, trechos, complementos, recortes } = montarAmbiente(
    ambiente,
    espessura,
    alturaInstalacao,
  );
  return {
    id: novoId("proj"),
    nome: "",
    ambiente,
    cliente: { nome: "", telefone: "" },
    criadoEm: agora,
    atualizadoEm: agora,
    bancada: { formato, trechos, espessura, alturaInstalacao },
    material: null,
    recortes,
    complementos,
    acabamentoBorda: { ...ACABAMENTO_PADRAO },
    sync: "local",
  };
}

export { novoId };
