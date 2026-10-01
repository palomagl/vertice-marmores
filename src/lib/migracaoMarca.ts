/**
 * Migração da marca antiga para Vértice Mármores.
 *
 * Até a troca de nome, o banco local e as chaves do navegador usavam o nome
 * antigo da empresa. Para quem já tinha projetos salvos, isto copia tudo
 * para os nomes novos (ver chaves.ts) UMA vez, sem perder nada:
 *
 *  - chaves do localStorage: copiadas assim que o app carrega, antes de
 *    qualquer leitura;
 *  - banco IndexedDB: projetos e configurações copiados para o banco novo,
 *    conferidos, e só então o banco antigo é apagado. Se algo falhar no meio,
 *    o antigo fica intacto e a cópia é tentada de novo na próxima abertura
 *    (projeto que já está no banco novo não é sobrescrito).
 *
 * Os nomes antigos aparecem só aqui (e no formato de backup antigo, em
 * backup.ts, para os .json exportados antes continuarem importáveis). Pode
 * apagar este arquivo quando ninguém mais tiver a versão antiga instalada.
 */
import Dexie from "dexie";
import type { Projeto } from "@/domain/project";
import { TABELA_PADRAO, type TabelaPrecos } from "@/domain/tabelaPrecos";
import { CHAVES } from "./chaves";
import { db, garantirNomeProjeto, type ConfigRow } from "./db";

const BANCO_ANTIGO = "df-marmoraria";

const CHAVES_ANTIGAS: [antiga: string, nova: string][] = [
  ["df-tema", CHAVES.tema],
  ["df-projeto-id", CHAVES.projetoAtual],
  ["df-proposta-seq", CHAVES.sequenciaProposta],
  ["df-onboarding-visto", CHAVES.onboardingVisto],
];

/** Nome da empresa que vinha de fábrica na versão antiga. */
const NOME_ANTIGO = /^\s*DF\s+M[áa]rmores(\s+e\s+Granitos)?\s*$/i;

/**
 * Síncrona. Roda sozinha quando o módulo carrega (ver o fim desta função) —
 * main.tsx importa este arquivo antes de tudo, então acontece antes de
 * qualquer leitura do localStorage.
 */
function migrarChavesLocais(): void {
  try {
    for (const [antiga, nova] of CHAVES_ANTIGAS) {
      const valor = localStorage.getItem(antiga);
      if (valor === null) continue;
      if (localStorage.getItem(nova) === null) localStorage.setItem(nova, valor);
      localStorage.removeItem(antiga);
    }
  } catch {
    /* storage bloqueado (navegação privada) — nada para migrar */
  }
}
migrarChavesLocais();

function renomearEmpresa(row: ConfigRow): ConfigRow {
  if (row.chave !== "tabelaPrecos") return row;
  const tabela = row.valor as Partial<TabelaPrecos> | undefined;
  if (!tabela?.empresa || !NOME_ANTIGO.test(tabela.empresa.nome ?? "")) return row;
  return {
    ...row,
    valor: { ...tabela, empresa: { ...tabela.empresa, nome: TABELA_PADRAO.empresa.nome } },
  };
}

/** Assíncrona — chamar antes da primeira leitura do banco (hidratar). */
export async function migrarBancoAntigo(): Promise<void> {
  try {
    if (!(await Dexie.exists(BANCO_ANTIGO))) return;

    // modo dinâmico: abre com o esquema que estiver lá, sem declarar versão
    const antigo = new Dexie(BANCO_ANTIGO);
    let projetos: Projeto[] = [];
    let config: ConfigRow[] = [];
    try {
      await antigo.open();
      const nomesTabelas = antigo.tables.map((t) => t.name);
      if (nomesTabelas.includes("projetos")) {
        projetos = await antigo.table<Projeto>("projetos").toArray();
      }
      if (nomesTabelas.includes("config")) {
        config = await antigo.table<ConfigRow>("config").toArray();
      }
    } finally {
      antigo.close();
    }

    await db.transaction("rw", db.projetos, db.config, async () => {
      for (const p of projetos) {
        if (await db.projetos.get(p.id)) continue;
        garantirNomeProjeto(p);
        await db.projetos.put(p);
      }
      for (const row of config) {
        if (await db.config.get(row.chave)) continue;
        await db.config.put(renomearEmpresa(row));
      }
    });

    // confere: todo projeto antigo tem que estar no banco novo
    const ids = projetos.map((p) => p.id);
    const copiados = (await db.projetos.bulkGet(ids)).filter(Boolean).length;
    if (copiados === ids.length) {
      // sem await: se outra aba ainda estiver com a versão antiga aberta, a
      // exclusão espera ela fechar — não precisa segurar a abertura do app
      Dexie.delete(BANCO_ANTIGO).catch((e) =>
        console.error("Não foi possível apagar o banco antigo", e),
      );
    }
  } catch (e) {
    // não trava o app: segue com o banco novo e tenta de novo na próxima vez
    console.error("Migração do banco antigo falhou", e);
  }
}
