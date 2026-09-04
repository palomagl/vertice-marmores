/**
 * Banner de instalação. Fora do modo standalone o IndexedDB pode ser descartado
 * (Safari iOS: ~7 dias sem interação). Instalar na tela de início protege os
 * projetos. O banner volta a cada sessão até o app estar instalado.
 */
import { useState } from "react";
import { estaInstalado, plataforma } from "@/lib/persistencia";

const CHAVE_OCULTAR = "df-banner-instalar-oculto";

const INSTRUCOES: Record<ReturnType<typeof plataforma>, string> = {
  ios: "No Safari: toque em Compartilhar (□↑) e depois em “Adicionar à Tela de Início”.",
  android: "No Chrome: menu ⋮ e depois “Instalar aplicativo” / “Adicionar à tela inicial”.",
  outro: "No navegador: menu ⋮ e depois “Instalar aplicativo”.",
};

export function InstalarBanner() {
  const [oculto, setOculto] = useState(() => {
    try {
      return sessionStorage.getItem(CHAVE_OCULTAR) === "1";
    } catch {
      return false;
    }
  });

  if (oculto || estaInstalado()) return null;

  const esconder = () => {
    try {
      sessionStorage.setItem(CHAVE_OCULTAR, "1");
    } catch {
      /* sessão sem storage — só esconde em memória */
    }
    setOculto(true);
  };

  return (
    <div className="instalar-banner" role="status">
      <div className="instalar-banner__texto">
        <strong>Adicione o app à tela de início</strong>
        <span>
          Assim os projetos ficam salvos com segurança no aparelho, mesmo sem uso
          por semanas. {INSTRUCOES[plataforma()]}
        </span>
      </div>
      <button className="instalar-banner__x" onClick={esconder} aria-label="Ocultar">
        ✕
      </button>
    </div>
  );
}
