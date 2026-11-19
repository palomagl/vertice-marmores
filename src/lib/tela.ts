/**
 * Consultas de tamanho de tela para o React.
 *
 * O layout é quase todo resolvido no CSS. Isto existe só para os casos em
 * que o COMPORTAMENTO muda, não só a aparência: no desktop o painel da
 * etapa fica docado e não pode ser fechado, porque a coluna ficaria vazia.
 */
import { useEffect, useState } from "react";

function assinar(consulta: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(consulta).matches;
}

export function useMediaQuery(consulta: string): boolean {
  const [combina, setCombina] = useState(() => assinar(consulta));

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(consulta);
    const aoMudar = () => setCombina(mql.matches);
    aoMudar();
    mql.addEventListener("change", aoMudar);
    return () => mql.removeEventListener("change", aoMudar);
  }, [consulta]);

  return combina;
}

/**
 * A partir daqui cabe 3D grande à esquerda + painel de 400px à direita sem
 * espremer nenhum dos dois. Abaixo disso o painel volta a subir por cima.
 */
export const LARGURA_DOCA = "(min-width: 1100px)";

export const useDoca = () => useMediaQuery(LARGURA_DOCA);
