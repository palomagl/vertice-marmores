/**
 * Onboarding de primeira vez — uma tela só, some pra sempre depois do
 * primeiro "Começar" (localStorage). O fluxo guiado em si é o tutorial;
 * isso aqui é só o convite inicial.
 */
import { useEffect, useState } from "react";
import { CHAVES } from "@/lib/chaves";

const CHAVE = CHAVES.onboardingVisto;

export function OnboardingModal() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      // storage bloqueado (ex.: navegação privada) — não trava o app, só não mostra
    }
  }, []);

  const comecar = () => {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      /* ignora — pior caso, aparece de novo na próxima vez */
    }
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="modal-backdrop" onClick={comecar}>
      <div className="modal modal--onboarding" onClick={(e) => e.stopPropagation()}>
        <h2>Vamos montar sua primeira peça</h2>
        <p>
          Vou te acompanhar passo a passo. Você poderá alterar qualquer informação antes de
          gerar o orçamento.
        </p>
        <button className="btn-primario" onClick={comecar}>
          Começar
        </button>
      </div>
    </div>
  );
}
