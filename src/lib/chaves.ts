/**
 * Nomes de tudo que o app guarda no navegador — um lugar só, para não ter
 * nome solto espalhado pelo código (e para a migração de marca saber o que
 * copiar; ver migracaoMarca.ts).
 */
export const BANCO_LOCAL = "vertice-marmoraria";

export const CHAVES = {
  /** tema claro/escuro (localStorage) */
  tema: "vertice-tema",
  /** id do projeto aberto por último (localStorage) */
  projetoAtual: "vertice-projeto-id",
  /** contador da numeração das propostas, por ano (localStorage) */
  sequenciaProposta: "vertice-proposta-seq",
  /** onboarding de primeira vez já visto (localStorage) */
  onboardingVisto: "vertice-onboarding-visto",
  /** banner de instalação ocultado nesta sessão (sessionStorage) */
  bannerInstalarOculto: "vertice-banner-instalar-oculto",
} as const;
