/**
 * Indicador de progresso do fluxo guiado — sempre visível, substitui a
 * antiga barra de 4 abas soltas. ✓ concluída · ● etapa atual · ○ ainda não.
 * Tocar em qualquer etapa pula direto pra ela — o padrão é sequencial
 * ("Continuar →"), mas o vendedor pode voltar ou adiantar quando quiser.
 *
 * A lógica de "está pronta?" mora em domain/etapas.ts (sem JSX, testável) —
 * este arquivo só desenha.
 */
import { ETAPAS, type EtapaId } from "@/domain/etapas";

export { ETAPAS, etapaConcluida, primeiraEtapaPendente, type EtapaId } from "@/domain/etapas";

export function EtapaRail({
  atual,
  concluida,
  onIr,
}: {
  atual: EtapaId;
  /**
   * Se a etapa está pronta PELOS DADOS (não só "o usuário já passou por
   * ela"). Reabrir um projeto já configurado mostra ✓ em tudo mesmo sem o
   * vendedor ter clicado em nada — é assim que devia ser: o check reflete
   * o projeto, não o histórico de navegação.
   */
  concluida: (id: EtapaId) => boolean;
  onIr: (id: EtapaId) => void;
}) {
  return (
    <nav className="etapa-rail" aria-label="Progresso do orçamento">
      {ETAPAS.map((e) => {
        const ativa = e.id === atual;
        const feita = !ativa && concluida(e.id);
        return (
          <button
            key={e.id}
            className={`etapa-rail__item ${ativa ? "is-atual" : ""} ${feita ? "is-feita" : ""}`}
            onClick={() => onIr(e.id)}
          >
            <span className="etapa-rail__marca">{feita ? "✓" : ativa ? "●" : "○"}</span>
            <span className="etapa-rail__label">{e.titulo}</span>
          </button>
        );
      })}
    </nav>
  );
}
