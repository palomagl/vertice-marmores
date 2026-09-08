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
  /**
   * "Em P" = "L com retorno curto" (especificação, seção 4: península) —
   * `contornoBancada`/`frameTrecho` tratam L e P com a MESMA matemática de
   * propósito (é a mesma topologia, dois trechos em ângulo reto); a única
   * diferença de fábrica é essa proporção. Hoje o retorno nascia do mesmo
   * tamanho do braço B do L (1800mm), então P e L saíam idênticos e o
   * vendedor nunca via diferença nenhuma entre os dois. AJUSTÁVEL — não é
   * regra de negócio travada, só um ponto de partida melhor que "igual ao L".
   */
  retornoPeninsulaP: 700,
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
  churrasqueira: "Churrasqueira",
  nicho: "Nicho",
  tanque: "Tanque",
  aparador: "Aparador",
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
  /**
   * comprimento do primeiro trecho, se o padrão do formato (2000mm pro
   * linear) não fizer sentido pro ambiente — um nicho de banheiro não nasce
   * com 2 metros. Ausente = usa o padrão do formato mesmo.
   */
  comprimentoPadrao?: number;
  /**
   * altura de instalação (mm), se diferente do padrão de bancada de cozinha
   * (DEFAULTS.alturaInstalacao, 900mm) — só importa pra peças com
   * `saiaAltura: "piso"` (o painel lateral desce até o chão: a altura da
   * peça inteira define o tamanho desse painel). Um aparador de sala tem
   * ~80cm, não 90cm. Ausente = usa a altura corrente do projeto.
   */
  alturaInstalacaoPadrao?: number;
  /**
   * true = a peça é de formato fixo (não é uma "bancada" que muda de
   * layout conforme o cômodo — é uma moldura/prateleira/console de forma
   * única). A etapa "Formato" não oferece Linear/L/P/U pra escolher; só
   * mostra que já está definido. Ausente/false = ambiente tipo bancada de
   * verdade (pia, gourmet...), onde faz sentido virar L/P/U.
   */
  formatoFixo?: boolean;
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
  /*
   * Os 4 ambientes abaixo vieram de medidas reais que a Paloma levantou
   * (não é pesquisa genérica de mercado — foi corrigido depois de uma
   * primeira rodada com números só aproximados). Ver cada comentário.
   */
  /*
   * Churrasqueira: é a MOLDURA de mármore em volta do nicho de alvenaria,
   * não uma bancada de apoio — moldura frontal 90×65cm externo, abertura
   * interna ~82×57cm (~4cm de moldura em cada lado, condizente com os 2cm
   * de espessura da peça), nicho de ~60cm de profundidade (não modelável —
   * a peça em si é só o painel frontal, plano; a profundidade do nicho é
   * alvenaria por trás, fora do que `geometry.ts` representa).
   * A moldura É uma bancada linear plana com um recorte retangular
   * (área molhada) do tamanho da abertura — o mesmo mecanismo de qualquer
   * cuba, só que aqui o "recorte" é o vão que dá pro fogão.
   */
  churrasqueira: {
    formato: "linear",
    formatoFixo: true, // é uma moldura de formato único, não uma bancada que muda de layout
    profundidade: 650, // altura externa da moldura
    comprimentoPadrao: 900, // largura externa da moldura
    todasBordasAcabadas: true, // moldura vista de frente, as 4 bordas ficam expostas
    frontaoLados: [],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [
      {
        tipo: "area_molhada",
        largura: 820,
        profundidade: 570,
        canto: "retangular",
        centralizada: true,
      },
    ],
    descricao:
      "Moldura de mármore da churrasqueira — painel 90×65cm com vão central 82×57cm pro nicho embutido (~60cm de profundidade, alvenaria).",
  },
  /*
   * Nicho: caixa 80×35×12cm; abrindo a frente, o interior fica ~74×29×10cm;
   * revestida em 5 peças (fundo, 2 laterais, topo, base) + borda frontal
   * 2cm. `geometry.ts` modela só UMA superfície contínua, não uma caixa de
   * 5 painéis soltos — mas o mecanismo de "frontão" (painel que sobe de uma
   * borda, já usado por pia/gourmet/lavanderia) serve exatamente pra isso:
   * a BASE (a prateleira, 740×120mm) é a bancada; frontão nos 3 lados
   * fechados (traseiro = fundo, esquerdo/direito = laterais) na altura
   * interna do nicho (29cm) monta as 3 paredes. Só "topo" fica de fora —
   * não existe complemento pra um painel horizontal por cima, e a frente
   * fica propositalmente aberta (é a abertura da peça). Resultado: uma
   * caixa de verdade com 3 paredes + base, não uma tábua reta.
   */
  nicho: {
    formato: "linear",
    formatoFixo: true, // prateleira reta, não tem "nicho em L"
    profundidade: 120,
    comprimentoPadrao: 740,
    todasBordasAcabadas: true,
    frontaoLados: ["traseiro", "esquerdo", "direito"], // fundo + 2 laterais, subindo da base
    frontaoAltura: 290, // altura interna do nicho (29cm)
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [],
    descricao:
      "Nicho de parede (banheiro/box) — caixa 80×35×12cm com fundo e laterais em pedra (altura interna 29cm), frente aberta. Topo é peça à parte, fora do orçamento automático.",
  },
  /*
   * Tanque: largura 100–120cm (meio: 110cm), profundidade 50–60cm (meio:
   * 55cm), cuba 45–55cm de largura × 35–45cm de profundidade (meio:
   * 50×40cm), cantos levemente arredondados. "Altura da peça 15–20cm" é a
   * ESPESSURA do bloco (não o campo `espessura` do app, que só aceita
   * 2/3cm hoje — decisão de não mexer nesse seletor pra um ambiente só,
   * fica só na descrição pro vendedor saber que é peça mais grossa).
   */
  tanque: {
    formato: "linear",
    formatoFixo: true, // peça avulsa de formato único
    profundidade: 550,
    comprimentoPadrao: 1100,
    todasBordasAcabadas: false,
    frontaoLados: ["traseiro"],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: [],
    saiaAltura: DEFAULTS.saia,
    recortes: [
      {
        tipo: "area_molhada",
        largura: 500,
        profundidade: 400,
        canto: "arredondado",
        centralizada: true,
      },
    ],
    descricao:
      "Tanque de lavar roupa avulso, cuba esculpida ~50×40cm — bloco costuma ser mais espesso (15–20cm) que uma bancada comum (2–3cm); ajuste a espessura na etapa Medidas se for cotar assim.",
  },
  /*
   * Aparador: medida equilibrada sugerida 110×40×80cm, tampo 3cm. A altura
   * (80cm) é bem menor que os 90cm padrão de bancada de cozinha — por isso
   * usa `alturaInstalacaoPadrao`, senão as laterais até o piso (saia)
   * sairiam 10cm mais altas que o desenho real. "Tampo 3cm" = espessura,
   * mesma ressalva do tanque: o seletor do app é 2/3cm, então dá pra
   * cotar certo trocando pra 3cm na etapa Medidas.
   */
  aparador: {
    formato: "linear",
    formatoFixo: true, // console reto, não tem "aparador em U"
    profundidade: 400,
    comprimentoPadrao: 1100,
    alturaInstalacaoPadrao: 800,
    todasBordasAcabadas: true,
    frontaoLados: [],
    frontaoAltura: DEFAULTS.frontao,
    saiaLados: ["esquerdo", "direito"],
    saiaAltura: "piso",
    recortes: [],
    descricao: "Aparador/console — tampo 110×40cm a 80cm do chão, laterais em pedra até o piso, sem cuba.",
  },
};

/**
 * Trechos default para cada formato, usando a profundidade do preset.
 * P é "L com retorno curto" (ver DEFAULTS.retornoPeninsulaP) — mesma
 * topologia de L (`contornoBancada`/`frameTrecho` continuam tratando os dois
 * juntos), só o braço B nasce bem mais curto pra parecer uma península de
 * verdade, não um segundo L.
 */
export function trechosPadrao(formato: Formato, profundidade: number): Bancada["trechos"] {
  switch (formato) {
    case "linear":
      return [{ comprimento: 2000, profundidade }];
    case "L":
      return [
        { comprimento: 2200, profundidade },
        { comprimento: 1800, profundidade },
      ];
    case "P":
      return [
        { comprimento: 2200, profundidade },
        { comprimento: DEFAULTS.retornoPeninsulaP, profundidade },
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

/**
 * Ajusta a lista de trechos ao trocar de formato: cresce usando os
 * comprimentos-padrão REAIS de cada posição do novo formato (ex.: U vira
 * 1800/2400/1800, não 1800/1800/1800), preservando os trechos que já
 * existiam; encolhe truncando os que sobram. Extraída do store pra ser
 * testável sem precisar de Dexie/IndexedDB.
 */
export function trechosAoTrocarFormato(
  atuais: Bancada["trechos"],
  novoFormato: Formato,
  profundidade: number,
): Bancada["trechos"] {
  const padrao = trechosPadrao(novoFormato, profundidade);
  if (atuais.length >= padrao.length) return atuais.slice(0, padrao.length);
  return padrao.map((def, i) => atuais[i] ?? def);
}

/**
 * Ao encolher o número de trechos (ex.: U → Linear), um recorte que estava
 * num trecho que deixou de existir (ex.: trecho 2, o braço C do U) NÃO pode
 * continuar "fantasma" — `geometriaRecorte`/`RecorteEditor` já grampeavam a
 * LEITURA pro último trecho válido, mas o dado salvo continuava apontando
 * pro trecho antigo, e reaparecia do nada se o vendedor voltasse pro U.
 * Aqui a realocação é definitiva: o recorte migra pro trecho 0 e passa a
 * centralizar (evita que uma distância antiga sobre num trecho bem menor).
 */
export function realocarRecortesOrfaos(
  recortes: Recorte[],
  novoNumTrechos: number,
): Recorte[] {
  return recortes.map((r) =>
    r.posicao.trecho >= novoNumTrechos
      ? { ...r, posicao: { ...r.posicao, trecho: 0, centralizada: true } }
      : r,
  );
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
  /** altura resolvida (== alturaInstalacao recebida, a menos que o preset sobrescreva) */
  alturaInstalacao: number;
} {
  const preset = PRESETS[ambiente];
  const trechos = trechosPadrao(preset.formato, preset.profundidade);
  if (preset.comprimentoPadrao != null && trechos[0]) {
    trechos[0] = { ...trechos[0], comprimento: preset.comprimentoPadrao };
  }
  const alturaResolvida = preset.alturaInstalacaoPadrao ?? alturaInstalacao;

  const alturaSaia =
    preset.saiaAltura === "piso"
      ? Math.max(alturaResolvida - espessura, 300)
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

  return { formato: preset.formato, trechos, complementos, recortes, alturaInstalacao: alturaResolvida };
}

/** Cria um Projeto em branco já com os defaults do ambiente escolhido. */
export function projetoNovo(ambiente: Ambiente = "pia"): Projeto {
  const agora = new Date().toISOString();
  const espessura = DEFAULTS.espessura;
  const { formato, trechos, complementos, recortes, alturaInstalacao } = montarAmbiente(
    ambiente,
    espessura,
    DEFAULTS.alturaInstalacao,
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
