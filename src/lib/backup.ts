/**
 * Backup local — exportar / importar projetos como .json.
 *
 * Enquanto não há Supabase, o .json é a única cópia fora do IndexedDB. Ida e
 * volta preserva o dado: `Projeto` é 100% serializável (strings, números,
 * arrays e objetos aninhados), então `JSON.parse(JSON.stringify(p))` === `p`.
 */
import type { Projeto } from "@/domain/project";
import { db, listarProjetos } from "./db";

const FORMATO = "vertice-marmores-backup";
/** backups gerados antes da troca de nome da empresa continuam importáveis */
const FORMATO_ANTIGO = "df-marmores-backup";
const VERSAO = 1;

interface Envelope {
  formato: string;
  versao: number;
  exportadoEm: string;
  projetos: Projeto[];
}

/** Gera o texto .json de um conjunto de projetos. */
export function serializarBackup(projetos: Projeto[]): string {
  const env: Envelope = {
    formato: FORMATO,
    versao: VERSAO,
    exportadoEm: new Date().toISOString(),
    projetos,
  };
  return JSON.stringify(env, null, 2);
}

/** Dispara o download de um arquivo de texto no navegador. */
export function baixarArquivo(nome: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function carimboArquivo(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

/** Exporta uma lista de projetos, baixa o .json e marca cada um como exportado. */
export async function exportarProjetos(projetos: Projeto[]): Promise<void> {
  if (projetos.length === 0) return;
  baixarArquivo(`vertice-marmores_${carimboArquivo()}.json`, serializarBackup(projetos));
  const agora = new Date().toISOString();
  await db.transaction("rw", db.projetos, async () => {
    for (const p of projetos) {
      await db.projetos.update(p.id, { exportadoEm: agora });
    }
  });
}

/** Exporta TODOS os projetos do banco local. */
export async function exportarTodos(): Promise<number> {
  const todos = await listarProjetos();
  await exportarProjetos(todos);
  return todos.length;
}

export interface ResultadoImport {
  novos: number;
  atualizados: number;
  ignorados: string[];
}

function ehProjetoValido(p: unknown): p is Projeto {
  const o = p as Partial<Projeto> | null;
  return (
    !!o &&
    typeof o.id === "string" &&
    typeof o.nome === "string" &&
    typeof o.ambiente === "string" &&
    typeof o.bancada === "object" &&
    o.bancada != null &&
    Array.isArray(o.recortes) &&
    Array.isArray(o.complementos)
  );
}

/**
 * Importa um backup. Projeto com id que já existe é sobrescrito (upsert).
 * O resultado é reimportável sem perda: os mesmos ids voltam para o banco.
 */
export async function importarBackup(texto: string): Promise<ResultadoImport> {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const env = dados as Partial<Envelope>;
  const formatoOk = env?.formato === FORMATO || env?.formato === FORMATO_ANTIGO;
  if (!formatoOk || !Array.isArray(env.projetos)) {
    throw new Error("Este arquivo não é um backup do Vértice Mármores.");
  }

  const res: ResultadoImport = { novos: 0, atualizados: 0, ignorados: [] };
  for (const p of env.projetos) {
    if (!ehProjetoValido(p)) {
      res.ignorados.push((p as { id?: string })?.id ?? "sem id");
      continue;
    }
    const existente = await db.projetos.get(p.id);
    await db.projetos.put(p);
    if (existente) res.atualizados++;
    else res.novos++;
  }
  return res;
}
