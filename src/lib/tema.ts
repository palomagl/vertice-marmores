/**
 * Tema visual (claro / escuro). A escolha fica no localStorage e é aplicada no
 * elemento <html> via data-theme, então vale para todas as telas.
 */
export type Tema = "claro" | "escuro";

const CHAVE = "df-tema";

export function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema === "escuro" ? "dark" : "light";
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    /* localStorage indisponível — mantém só na sessão */
  }
}
