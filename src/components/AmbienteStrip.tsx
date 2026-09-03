/**
 * Faixa de ambientes no topo (especificação, seção 4.1: "a sacada que vale roubar").
 * Cada card carrega os defaults certos. As imagens são placeholders com gradiente
 * até chegarem as fotos reais em /public/ambientes/<id>.jpg.
 */
import { AMBIENTE_LABEL, PRESETS } from "@/domain/presets";
import type { Ambiente } from "@/domain/project";
import { useProjectStore } from "@/store/projectStore";

const AMBIENTES: Ambiente[] = ["pia", "gourmet", "banheiro", "ilha", "balcao"];

const FUNDO: Record<Ambiente, string> = {
  pia: "linear-gradient(135deg, #d9c7b0, #b8a184)",
  gourmet: "linear-gradient(135deg, #cdbfa6, #9c8a6b)",
  banheiro: "linear-gradient(135deg, #dfe4e6, #b9c4c9)",
  ilha: "linear-gradient(135deg, #e6e0d5, #c9bfaa)",
  balcao: "linear-gradient(135deg, #d7cdbd, #a9977c)",
};

export function AmbienteStrip() {
  const atual = useProjectStore((s) => s.projeto.ambiente);
  const aplicarAmbiente = useProjectStore((s) => s.aplicarAmbiente);

  return (
    <div className="ambientes-strip">
      {AMBIENTES.map((a) => (
        <button
          key={a}
          className={`ambiente-card ${a === atual ? "is-active" : ""}`}
          style={{ backgroundImage: FUNDO[a] }}
          title={PRESETS[a].descricao}
          onClick={() => aplicarAmbiente(a)}
        >
          <span className="ambiente-card__label">{AMBIENTE_LABEL[a]}</span>
        </button>
      ))}
    </div>
  );
}
