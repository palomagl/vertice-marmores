/**
 * Persistência do armazenamento local.
 *
 * O Safari do iOS descarta o IndexedDB de um site sem interação por ~7 dias.
 * Um vendedor que viaja duas semanas perderia todos os projetos. PWA instalado
 * na tela de início é isento. Aqui a gente:
 *   1. pede `navigator.storage.persist()` (o navegador concede sozinho quando o
 *      site é PWA instalado ou tem engajamento suficiente);
 *   2. expõe `estaInstalado()` para o banner que orienta a instalação.
 */

/** Pede armazenamento persistente ao navegador e loga o resultado. */
export async function pedirPersistencia(): Promise<boolean> {
  const s = navigator.storage;
  if (!s?.persist) {
    console.info("[persistência] navigator.storage.persist indisponível neste navegador");
    return false;
  }
  try {
    if (await s.persisted()) {
      console.info("[persistência] armazenamento já é persistente");
      return true;
    }
    const ok = await s.persist();
    console.info(`[persistência] persist() => ${ok ? "CONCEDIDO" : "NEGADO (dados podem ser descartados)"}`);
    return ok;
  } catch (e) {
    console.warn("[persistência] falha ao pedir persistência", e);
    return false;
  }
}

/** true quando o app roda como PWA instalado (tela de início / janela própria). */
export function estaInstalado(): boolean {
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    if (window.matchMedia?.("(display-mode: window-controls-overlay)").matches) return true;
    // iOS Safari não suporta display-mode; usa navigator.standalone
    const nav = navigator as unknown as { standalone?: boolean };
    return nav.standalone === true;
  } catch {
    return false;
  }
}

/** "ios" | "android" | "outro" — só para escolher o texto de instrução do banner. */
export function plataforma(): "ios" | "android" | "outro" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "outro";
}
