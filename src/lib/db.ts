/**
 * Banco local (especificação, seção 11: "offline é requisito, não luxo").
 * O vendedor mede na casa do cliente, muitas vezes sem sinal. Tudo grava aqui
 * primeiro; a sincronização com o Supabase é um passo separado, quando houver rede.
 */
import Dexie, { type Table } from "dexie";
import type { Projeto } from "@/domain/project";
import { nomeProjetoPadrao } from "@/domain/presets";
import type { TabelaPrecos } from "@/domain/tabelaPrecos";
import { BANCO_LOCAL, CHAVES } from "./chaves";

export interface ConfigRow {
  chave: string;
  valor: unknown;
}

/** Projeto antigo que nasceu "sem identificação" ganha o nome padrão. */
export function garantirNomeProjeto(p: Projeto): void {
  if (!p.nome || !p.nome.trim()) {
    p.nome = nomeProjetoPadrao(
      p.cliente?.nome ?? "",
      p.ambiente,
      p.criadoEm ?? p.atualizadoEm ?? new Date().toISOString(),
    );
  }
}

class MarmorariaDB extends Dexie {
  projetos!: Table<Projeto, string>;
  config!: Table<ConfigRow, string>;

  constructor() {
    super(BANCO_LOCAL);
    // v1 — esquema original
    this.version(1).stores({
      projetos: "id, atualizadoEm, ambiente",
      config: "chave",
    });
    // v2 — projeto sempre com nome legível na lista. Backfill dos antigos que
    // nasceram "sem identificação". Nenhuma mudança de índice.
    this.version(2)
      .stores({
        projetos: "id, atualizadoEm, ambiente",
        config: "chave",
      })
      .upgrade(async (tx) => {
        await tx
          .table<Projeto>("projetos")
          .toCollection()
          .modify(garantirNomeProjeto);
      });
  }
}

export const db = new MarmorariaDB();

const K_PROJETO_ATUAL = CHAVES.projetoAtual;

export const idProjetoAtual = {
  get: () => localStorage.getItem(K_PROJETO_ATUAL),
  set: (id: string) => localStorage.setItem(K_PROJETO_ATUAL, id),
  clear: () => localStorage.removeItem(K_PROJETO_ATUAL),
};

export async function salvarProjeto(p: Projeto): Promise<void> {
  await db.projetos.put(p);
}

export async function listarProjetos(): Promise<Projeto[]> {
  return db.projetos.orderBy("atualizadoEm").reverse().toArray();
}

export async function carregarProjeto(id: string): Promise<Projeto | undefined> {
  return db.projetos.get(id);
}

export async function excluirProjeto(id: string): Promise<void> {
  await db.projetos.delete(id);
}

export async function salvarTabela(t: TabelaPrecos): Promise<void> {
  await db.config.put({ chave: "tabelaPrecos", valor: t });
}

export async function carregarTabela(): Promise<TabelaPrecos | undefined> {
  const row = await db.config.get("tabelaPrecos");
  return row?.valor as TabelaPrecos | undefined;
}
