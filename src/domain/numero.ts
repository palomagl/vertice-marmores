/**
 * Numeração sequencial das propostas (especificação, seção 10): "2026-0142".
 * Contador local por ano. Em produção, mover para o banco (sequência atômica).
 */
import { CHAVES } from "@/lib/chaves";

const CHAVE = CHAVES.sequenciaProposta;

export function proximoNumeroProposta(): string {
  const ano = new Date().getFullYear();
  let mapa: Record<string, number> = {};
  try {
    mapa = JSON.parse(localStorage.getItem(CHAVE) ?? "{}");
  } catch {
    mapa = {};
  }
  const n = (mapa[ano] ?? 0) + 1;
  mapa[ano] = n;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    /* modo privado / storage cheio — segue com o número em memória */
  }
  return `${ano}-${String(n).padStart(4, "0")}`;
}
