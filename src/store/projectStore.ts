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
import {
  PRESETS,
  montarAmbiente,
  novoId,
  projetoNovo,
  trechosPadrao,
} from "@/domain/presets";
import { TABELA_PADRAO, type TabelaPrecos } from "@/domain/tabelaPrecos";
import { proximoNumeroProposta } from "@/domain/numero";
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

interface ProjectState {
  projeto: Projeto;
  tabela: TabelaPrecos;
  lista: Projeto[];
  carregado: boolean;

  // UI
  aba: Aba;
  modo: ModoVisualizacao;
  apresentacao: boolean;

  setAba: (aba: Aba) => void;
  setModo: (modo: ModoVisualizacao) => void;
  toggleModo: () => void;
  setApresentacao: (v: boolean) => void;

  // ciclo de vida
  hidratar: () => Promise<void>;
  recarregarLista: () => Promise<void>;
  novoProjeto: (ambiente?: Ambiente) => Promise<void>;
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

  /** aplica um patch no projeto e grava no disco */
  const alterar = (mut: (p: Projeto) => void) => {
    const projeto = commit(get().projeto, mut);
    set({ projeto });
    void salvarProjeto(projeto);
  };

  return {
    projeto: projetoNovo("pia"),
    tabela: TABELA_PADRAO,
    lista: [],
    carregado: false,

    aba: "ambientes",
    modo: "3d",
    apresentacao: false,

    setAba: (aba) => set({ aba }),
    setModo: (modo) => set({ modo }),
    toggleModo: () => set((s) => ({ modo: s.modo === "2d" ? "3d" : "2d" })),
    setApresentacao: (apresentacao) => set({ apresentacao }),

    hidratar: async () => {
      if (hidratando || get().carregado) return;
      hidratando = true;
      const tabelaSalva = await carregarTabela();
      const id = idProjetoAtual.get();
      let projeto = id ? await carregarProjeto(id) : undefined;
      if (!projeto) {
        projeto = projetoNovo("pia");
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
      set({ projeto, tabela, lista, carregado: true });
      hidratando = false;
    },

    recarregarLista: async () => set({ lista: await listarProjetos() }),

    novoProjeto: async (ambiente = "pia") => {
      const projeto = projetoNovo(ambiente);
      await salvarProjeto(projeto);
      idProjetoAtual.set(projeto.id);
      set({ projeto, aba: "medidas", apresentacao: false });
      await get().recarregarLista();
    },

    abrirProjeto: async (id) => {
      const projeto = await carregarProjeto(id);
      if (!projeto) return;
      idProjetoAtual.set(id);
      set({ projeto, aba: "medidas", apresentacao: false });
    },

    excluirProjeto: async (id) => {
      await dbExcluir(id);
      if (get().projeto.id === id) {
        idProjetoAtual.clear();
        await get().hidratar();
      } else {
        await get().recarregarLista();
      }
    },

    aplicarAmbiente: (ambiente) =>
      alterar((p) => {
        const { formato, trechos, complementos, recortes } = montarAmbiente(
          ambiente,
          p.bancada.espessura,
          p.bancada.alturaInstalacao,
        );
        p.ambiente = ambiente;
        p.bancada.formato = formato;
        p.bancada.trechos = trechos;
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
        const alvo = trechosPadrao(formato, prof).length;
        while (p.bancada.trechos.length < alvo) {
          p.bancada.trechos.push({ comprimento: 1800, profundidade: prof });
        }
        if (p.bancada.trechos.length > alvo) {
          p.bancada.trechos = p.bancada.trechos.slice(0, alvo);
        }
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

    setTabela: (patch) =>
      set((s) => {
        const tabela = { ...s.tabela, ...patch };
        void salvarTabela(tabela);
        return { tabela };
      }),
  };
});
