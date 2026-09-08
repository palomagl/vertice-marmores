/**
 * Seletor visual de formato — a etapa "Formato" do fluxo guiado.
 *
 * Os desenhos NÃO são ícones inventados: cada um é o contorno REAL que
 * `contornoBancada()` (geometry.ts) gera pros comprimentos-padrão daquele
 * formato (`trechosPadrao`, presets.ts) — a mesma função que alimenta o SVG
 * grande, o 3D e o orçamento. Se um dia a geometria de um formato mudar, a
 * miniatura muda junto sozinha; não tem desenho duplicado pra ficar
 * desatualizado.
 */
import { contornoBancada } from "@/domain/geometry";
import type { Formato } from "@/domain/project";
import { AMBIENTE_LABEL, FORMATO_LABEL, PRESETS, trechosPadrao } from "@/domain/presets";
import { useProjectStore } from "@/store/projectStore";

const FORMATOS: Formato[] = ["linear", "L", "P", "U"];
/** profundidade só pra desenhar a miniatura — não é a profundidade real do projeto */
const PROFUNDIDADE_ILUSTRATIVA = 600;

function miniContorno(formato: Formato): { viewBox: string; points: string } {
  const trechos = trechosPadrao(formato, PROFUNDIDADE_ILUSTRATIVA);
  const { pontos } = contornoBancada({
    formato,
    trechos,
    espessura: 20,
    alturaInstalacao: 900,
  });
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  const m = Math.max(w, h) * 0.1;
  // mesma convenção do Drawing2D: fundo (parede) fica pra cima da miniatura
  const points = pontos.map((p) => `${p.x - minX + m},${maxY - p.y + m}`).join(" ");
  return { viewBox: `0 0 ${w + m * 2} ${h + m * 2}`, points };
}

export function FormatoPicker() {
  const ambiente = useProjectStore((s) => s.projeto.ambiente);
  const formato = useProjectStore((s) => s.projeto.bancada.formato);
  const setFormato = useProjectStore((s) => s.setFormato);

  // peças de formato único (moldura, prateleira, console, tanque avulso) não
  // são "bancada" que muda de layout — Linear/L/P/U não fazem sentido aqui
  if (PRESETS[ambiente].formatoFixo) {
    const { viewBox, points } = miniContorno(formato);
    return (
      <div className="formato-picker formato-picker--fixo">
        <div className="formato-card is-active is-fixo">
          <svg viewBox={viewBox} className="formato-card__svg" preserveAspectRatio="xMidYMid meet">
            <polygon points={points} vectorEffect="non-scaling-stroke" />
          </svg>
          <span>{FORMATO_LABEL[formato]}</span>
        </div>
        <p className="formato-picker__nota">
          {AMBIENTE_LABEL[ambiente]} é uma peça de formato único — não muda de layout como uma
          bancada. As medidas continuam ajustáveis na próxima etapa.
        </p>
      </div>
    );
  }

  return (
    <div className="formato-picker">
      {FORMATOS.map((f) => {
        const { viewBox, points } = miniContorno(f);
        return (
          <button
            key={f}
            className={`formato-card ${f === formato ? "is-active" : ""}`}
            onClick={() => setFormato(f)}
          >
            <svg
              viewBox={viewBox}
              className="formato-card__svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <polygon points={points} vectorEffect="non-scaling-stroke" />
            </svg>
            <span>{FORMATO_LABEL[f]}</span>
          </button>
        );
      })}
    </div>
  );
}
