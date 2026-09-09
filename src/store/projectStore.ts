import { create } from "zustand";
import type {
  AcabamentoBorda,
  Ambiente,
  Complemento,
  Formato,
  Lado,
  Material,
  Projeto,
  Recorte,
} from "@/domain/project";
import { MATERIAIS } from "@/domain/catalogo";
import {
  PRESETS,
  montarAmbiente,
  nomeProjetoPadrao,
  novoId,
  projetoNovo,
  realocarRecortesOrfaos,
  trechosAoTrocarFormato,
} from "@/domain/presets";
import { TABELA_PADRAO, type TabelaPrecos } from "@/domain/tabelaPrecos";
import { proximoNumeroProposta } from "@/domain/numero";
import { aplicarTema, lerTema, type Tema } from "@/lib/tema";
import {
  carregarProjeto,
  carregarTabela,
  excluirProjeto as dbExcluir,
  idProjetoAtual,
  listarProjetos,
  salvarProjeto,
  salvarTabela,
} from "@/lib/db";

export type Aba = "pedras" | "componentes" | "medidas" | "ambientes";
export type ModoVisualizacao = "2d" | "3d";

/** profundidade da pilha de desfazer/refazer */
const HIST_MAX = 20;

/** pedra pré-selecionada em todo projeto novo — a tela nunca aparece "cinza" */
const PEDRA_PADRAO: Material =
  MATERIAIS.find((m) => m.id === "granito_branco_siena") ?? MATERIAIS[0];

interface ProjectState {
  projeto: Projeto;
  tabela: TabelaPrecos;
  lista: Projeto[];
  carregado: boolean;

  /** pilha de estados anteriores / refeitos (JSON do projeto) */
  historico: Projeto[];
  futuro: Projeto[];

  // UI
  aba: Aba;
  modo: ModoVisualizacao;
  apresentacao: boolean;
  tema: Tema;
  /** modal "Novo projeto" (passo do nome do cliente) aberto */
  criandoProjeto: boolean;
  /**
   * true só entre criar um projeto e o Configurador montar — diz pro editor
   * se deve começar do zero (Ambiente) ou pular pra onde os dados pedem
   * (ver `primeiraEtapaPendente`, EtapaRail.tsx).
   */
  recemCriado: boolean;

  setAba: (aba: Aba) => void;
  setModo: (modo: ModoVisualizacao) => void;
  toggleModo: () => void;
  setApresentacao: (v: boolean) => void;
  alternarTema: () => void;

  // desfazer / refazer
  desfazer: () => void;
  refazer: () => void;

  // ciclo de vida
  hidratar: () => Promise<void>;
  recarregarLista: () => Promise<void>;
  iniciarNovoProjeto: () => void;
  cancelarNovoProjeto: () => void;
  criarProjeto: (cliente: { nome: string; telefone: string }) => Promise<void>;
  abrirProjeto: (id: string) => Promise<void>;
  excluirProjeto: (id: string) => Promise<void>;

  // projeto
  aplicarAmbiente: (ambiente: Ambiente) => void;
  setNome: (nome: string) => void;
  setCliente: (patch: Partial<Projeto["cliente"]>) => void;
  setFormato: (formato: Formato) => void;
  setTrecho: (index: number, patch: Partial<Projeto["bancada"]["trechos"][number]>) => void;
  setEspessura: (mm: number) => void;
  setAlturaInstalacao: (mm: number) => void;
  setMaterial: (material: Material | null) => void;
  setAcabamento: (patch: Partial<AcabamentoBorda>) => void;
  addRecorte: (recorte: Omit<Recorte, "id">) => void;
  updateRecorte: (id: string, patch: Partial<Recorte>) => void;
  removeRecorte: (id: string) => void;
  addComplemento: (c: Omit<Complemento, "id">) => void;
  removeComplemento: (id: string) => void;
  /** define a altura de um frontão/saia num lado (0 = remove) */
  setAbaLado: (tipo: "frontao" | "saia", lado: Lado, alturaMm: number) => void;
  setAbaReforco: (tipo: "frontao" | "saia", lado: Lado, reforco: boolean) => void;
  /** atribui o número sequencial da proposta, se ainda não tiver */
  garantirNumeroProposta: () => void;
  /**
   * "Formatura": o vendedor completou o fluxo guiado uma vez nesta sessão
   * (chegou na Revisão) — a partir daqui o Configurador usa o modo de
   * edição rápida pro resto da sessão, mesmo sem sair da tela. Reabrir o
   * projeto depois (abrirProjeto) já cai em edição de qualquer forma.
   */
  finalizarCriacao: () => void;
  /** distância de entrega em km (undefined = não informado; 0 = retirada na loja) */
  setDistanciaKm: (km: number | undefined) => void;

  // admin
  setTabela: (patch: Partial<TabelaPrecos>) => void;
}

function commit(projeto: Projeto, mut: (p: Projeto) => void): Projeto {
  const p: Projeto = structuredClone(projeto);
  mut(p);
  p.atualizadoEm = new Date().toISOString();
  p.sync = "local";
  return p;
}

export const useProjectStore = create<ProjectState>()((set, get) => {
  /** evita hidratação concorrente (React StrictMode chama o efeito duas vezes) */
  let hidratando = false;

  /** aplica um patch no projeto, empilha o estado anterior e grava no disco */
  const alterar = (mut: (p: Projeto) => void) => {
    const anterior = get().projeto;
    const projeto = commit(anterior, mut);
    set((s) => ({
      projeto,
      historico: [...s.historico, anterior].slice(-HIST_MAX),
      futuro: [],
    }));
    void salvarProjeto(projeto);
  };

  return {
    projeto: projetoNovo("pia"),
    tabela: TABELA_PADRAO,
    lista: [],
    carregado: false,
    historico: [],
    futuro: [],

    aba: "ambientes",
    modo: "3d",
    apresentacao: false,
    tema: lerTema(),
    criandoProjeto: false,
    recemCriado: false,

    setAba: (aba) => set({ aba }),
    setModo: (modo) => set({ modo }),
    toggleModo: () => set((s) => ({ modo: s.modo === "2d" ? "3d" : "2d" })),
    setApresentacao: (apresentacao) => set({ apresentacao }),
    alternarTema: () =>
      set((s) => {
        const tema: Tema = s.tema === "escuro" ? "claro" : "escuro";
        aplicarTema(tema);
        return { tema };
      }),

    desfazer: () => {
      const { historico, futuro, projeto } = get();
      if (!historico.length) return;
      const anterior = historico[historico.length - 1];
      set({
        projeto: anterior,
        historico: historico.slice(0, -1),
        futuro: [projeto, ...futuro].slice(0, HIST_MAX),
      });
      void salvarProjeto(anterior);
    },

    refazer: () => {
      const { historico, futuro, projeto } = get();
      if (!futuro.length) return;
      const proximo = futuro[0];
      set({
        projeto: proximo,
        historico: [...historico, projeto].slice(-HIST_MAX),
        futuro: futuro.slice(1),
      });
      void salvarProjeto(proximo);
    },

    hidratar: async () => {
      if (hidratando || get().carregado) return;
      hidratando = true;
      const tabelaSalva = await carregarTabela();
      const id = idProjetoAtual.get();
      let projeto = id ? await carregarProjeto(id) : undefined;
      if (!projeto) {
        projeto = projetoNovo("pia");
        projeto.material = PEDRA_PADRAO;
        projeto.nome = nomeProjetoPadrao("", projeto.ambiente, projeto.criadoEm);
        await salvarProjeto(projeto);
        idProjetoAtual.set(projeto.id);
      }
      const lista = await listarProjetos();
      // mescla com o padrão para cobrir campos novos em tabelas antigas
      const tabela: TabelaPrecos = {
        ...TABELA_PADRAO,
        ...tabelaSalva,
        empresa: { ...TABELA_PADRAO.empresa, ...(tabelaSalva?.empresa ?? {}) },
      };
      set({ projeto, tabela, lista, carregado: true, historico: [], futuro: [] });
      hidratando = false;
    },

    recarregarLista: async () => set({ lista: await listarProjetos() }),

    iniciarNovoProjeto: () => set({ criandoProjeto: true }),
    cancelarNovoProjeto: () => set({ criandoProjeto: false }),

    criarProjeto: async (cliente) => {
      const p = projetoNovo("pia");
      p.cliente = { nome: cliente.nome.trim(), telefone: cliente.telefone.trim() };
      p.nome = nomeProjetoPadrao(p.cliente.nome, p.ambiente, p.criadoEm);
      p.material = PEDRA_PADRAO;
      await salvarProjeto(p);
      idProjetoAtual.set(p.id);
      set({
        projeto: p,
        aba: "medidas",
        apresentacao: false,
        criandoProjeto: false,
        recemCriado: true,
        historico: [],
        futuro: [],
      });
      await get().recarregarLista();
    },

    abrirProjeto: async (id) => {
      const projeto = await carregarProjeto(id);
      if (!projeto) return;
      idProjetoAtual.set(id);
      set({
        projeto,
        aba: "medidas",
        apresentacao: false,
        recemCriado: false,
        historico: [],
        futuro: [],
      });
    },

    excluirProjeto: async (id) => {
      await dbExcluir(id);
      if (get().projeto.id === id) {
        idProjetoAtual.clear();
        set({ carregado: false });
        await get().hidratar();
      } else {
        await get().recarregarLista();
      }
    },

    aplicarAmbiente: (ambiente) =>
      alterar((p) => {
        const { formato, trechos, complementos, recortes, alturaInstalacao, espessura } =
          montarAmbiente(ambiente, p.bancada.espessura, p.bancada.alturaInstalacao);
        p.ambiente = ambiente;
        p.bancada.formato = formato;
        p.bancada.trechos = trechos;
        // a maioria dos ambientes não sobrescreve altura/espessura (usa a
        // corrente, igual sempre foi); só ambientes com peça própria (ex.:
        // aparador ~80cm/3cm, tanque ~18cm de bloco) mudam isso
        p.bancada.alturaInstalacao = alturaInstalacao;
        p.bancada.espessura = espessura;
        // troca frontão/saia/recortes pelos do ambiente; mantém extras que o vendedor tenha adicionado à mão
        p.complementos = [
          ...p.complementos.filter((c) => c.tipo !== "frontao" && c.tipo !== "saia"),
          ...complementos,
        ];
        p.recortes = recortes;
      }),

    setNome: (nome) => alterar((p) => void (p.nome = nome)),
    setCliente: (patch) => alterar((p) => void (p.cliente = { ...p.cliente, ...patch })),

    setFormato: (formato) =>
      alterar((p) => {
        const prof = p.bancada.trechos[0]?.profundidade ?? PRESETS[p.ambiente].profundidade;
        p.bancada.formato = formato;
        p.bancada.trechos = trechosAoTrocarFormato(p.bancada.trechos, formato, prof);
        // recorte cujo trecho deixou de existir não fica fantasma no estado
        p.recortes = realocarRecortesOrfaos(p.recortes, p.bancada.trechos.length);
      }),

    setTrecho: (index, patch) =>
      alterar((p) => {
        const t = p.bancada.trechos[index];
        if (t) p.bancada.trechos[index] = { ...t, ...patch };
      }),

    setEspessura: (mm) => alterar((p) => void (p.bancada.espessura = mm)),
    setAlturaInstalacao: (mm) => alterar((p) => void (p.bancada.alturaInstalacao = mm)),
    setMaterial: (material) => alterar((p) => void (p.material = material)),
    setAcabamento: (patch) => alterar((p) => void (p.acabamentoBorda = { ...p.acabamentoBorda, ...patch })),

    addRecorte: (recorte) => alterar((p) => void p.recortes.push({ ...recorte, id: novoId("rec") })),
    updateRecorte: (id, patch) =>
      alterar((p) => {
        const idx = p.recortes.findIndex((r) => r.id === id);
        if (idx >= 0) p.recortes[idx] = { ...p.recortes[idx], ...patch };
      }),
    removeRecorte: (id) => alterar((p) => void (p.recortes = p.recortes.filter((r) => r.id !== id))),

    addComplemento: (c) => alterar((p) => void p.complementos.push({ ...c, id: novoId("cmp") })),
    removeComplemento: (id) =>
      alterar((p) => void (p.complementos = p.complementos.filter((c) => c.id !== id))),

    setAbaLado: (tipo, lado, alturaMm) =>
      alterar((p) => {
        const i = p.complementos.findIndex((c) => c.tipo === tipo && c.lado === lado);
        if (alturaMm <= 0) {
          if (i >= 0) p.complementos.splice(i, 1);
        } else if (i >= 0) {
          p.complementos[i] = { ...p.complementos[i], altura: alturaMm };
        } else {
          p.complementos.push({ id: novoId("cmp"), tipo, lado, altura: alturaMm, trechos: [] });
        }
      }),

    setAbaReforco: (tipo, lado, reforco) =>
      alterar((p) => {
        const i = p.complementos.findIndex((c) => c.tipo === tipo && c.lado === lado);
        if (i >= 0) p.complementos[i] = { ...p.complementos[i], reforco };
      }),

    garantirNumeroProposta: () => {
      if (get().projeto.numero) return;
      const numero = proximoNumeroProposta();
      alterar((p) => void (p.numero = numero));
    },

    finalizarCriacao: () => set({ recemCriado: false }),

    setDistanciaKm: (km) =>
      alterar((p) => {
        if (km == null || Number.isNaN(km)) delete p.distanciaKm;
        else p.distanciaKm = Math.max(0, Math.round(km));
      }),

    setTabela: (patch) =>
      set((s) => {
        const tabela = { ...s.tabela, ...patch };
        void salvarTabela(tabela);
        return { tabela };
      }),
  };
});
