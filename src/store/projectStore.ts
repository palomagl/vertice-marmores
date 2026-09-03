import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AcabamentoBorda,
  Ambiente,
  Complemento,
  Formato,
  Material,
  Projeto,
  Recorte,
} from "@/domain/project";
import {
  DEFAULTS,
  PRESETS,
  novoId,
  projetoNovo,
  trechosPadrao,
} from "@/domain/presets";
import { TABELA_PADRAO, type TabelaPrecos } from "@/domain/tabelaPrecos";

export type Aba = "pedras" | "componentes" | "medidas" | "ambientes";
export type ModoVisualizacao = "2d" | "3d";

interface ProjectState {
  projeto: Projeto;
  tabela: TabelaPrecos;

  // UI
  aba: Aba;
  modo: ModoVisualizacao;
  apresentacao: boolean;

  // ações de UI
  setAba: (aba: Aba) => void;
  setModo: (modo: ModoVisualizacao) => void;
  toggleModo: () => void;
  setApresentacao: (v: boolean) => void;

  // ações de projeto
  novoProjeto: (ambiente?: Ambiente) => void;
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
}

/** aplica um patch no projeto e atualiza o carimbo de tempo + marca como local */
function commit(projeto: Projeto, mut: (p: Projeto) => void): Projeto {
  const p: Projeto = structuredClone(projeto);
  mut(p);
  p.atualizadoEm = new Date().toISOString();
  p.sync = "local";
  return p;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projeto: projetoNovo("pia"),
      tabela: TABELA_PADRAO,

      aba: "ambientes",
      modo: "2d",
      apresentacao: false,

      setAba: (aba) => set({ aba }),
      setModo: (modo) => set({ modo }),
      toggleModo: () => set((s) => ({ modo: s.modo === "2d" ? "3d" : "2d" })),
      setApresentacao: (apresentacao) => set({ apresentacao }),

      novoProjeto: (ambiente = "pia") =>
        set({ projeto: projetoNovo(ambiente), aba: "medidas", apresentacao: false }),

      aplicarAmbiente: (ambiente) =>
        set((s) => {
          const preset = PRESETS[ambiente];
          return {
            projeto: commit(s.projeto, (p) => {
              p.ambiente = ambiente;
              p.bancada.formato = preset.formato;
              p.bancada.trechos = trechosPadrao(preset.formato, preset.profundidade);
              // frontão conforme o preset
              p.complementos = p.complementos.filter((c) => c.tipo !== "frontao");
              if (preset.comFrontao) {
                p.complementos.push({
                  id: novoId("cmp"),
                  tipo: "frontao",
                  altura: DEFAULTS.frontao,
                  trechos: p.bancada.trechos.map((_, i) => i),
                });
              }
              if (preset.comSaia && !p.complementos.some((c) => c.tipo === "saia")) {
                p.complementos.push({
                  id: novoId("cmp"),
                  tipo: "saia",
                  altura: DEFAULTS.saia,
                  trechos: p.bancada.trechos.map((_, i) => i),
                });
              }
            }),
          };
        }),

      setNome: (nome) => set((s) => ({ projeto: commit(s.projeto, (p) => void (p.nome = nome)) })),

      setCliente: (patch) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.cliente = { ...p.cliente, ...patch };
          }),
        })),

      setFormato: (formato) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            const prof = p.bancada.trechos[0]?.profundidade ?? PRESETS[p.ambiente].profundidade;
            p.bancada.formato = formato;
            const alvo = trechosPadrao(formato, prof).length;
            const atual = p.bancada.trechos;
            if (atual.length < alvo) {
              while (p.bancada.trechos.length < alvo) {
                p.bancada.trechos.push({ comprimento: 1800, profundidade: prof });
              }
            } else if (atual.length > alvo) {
              p.bancada.trechos = atual.slice(0, alvo);
            }
          }),
        })),

      setTrecho: (index, patch) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            const t = p.bancada.trechos[index];
            if (t) p.bancada.trechos[index] = { ...t, ...patch };
          }),
        })),

      setEspessura: (mm) =>
        set((s) => ({ projeto: commit(s.projeto, (p) => void (p.bancada.espessura = mm)) })),

      setAlturaInstalacao: (mm) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => void (p.bancada.alturaInstalacao = mm)),
        })),

      setMaterial: (material) =>
        set((s) => ({ projeto: commit(s.projeto, (p) => void (p.material = material)) })),

      setAcabamento: (patch) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.acabamentoBorda = { ...p.acabamentoBorda, ...patch };
          }),
        })),

      addRecorte: (recorte) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.recortes.push({ ...recorte, id: novoId("rec") });
          }),
        })),

      updateRecorte: (id, patch) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            const idx = p.recortes.findIndex((r) => r.id === id);
            if (idx >= 0) p.recortes[idx] = { ...p.recortes[idx], ...patch };
          }),
        })),

      removeRecorte: (id) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.recortes = p.recortes.filter((r) => r.id !== id);
          }),
        })),

      addComplemento: (c) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.complementos.push({ ...c, id: novoId("cmp") });
          }),
        })),

      removeComplemento: (id) =>
        set((s) => ({
          projeto: commit(s.projeto, (p) => {
            p.complementos = p.complementos.filter((c) => c.id !== id);
          }),
        })),
    }),
    {
      name: "df-projeto-atual",
      partialize: (s) => ({ projeto: s.projeto, tabela: s.tabela }),
    },
  ),
);
