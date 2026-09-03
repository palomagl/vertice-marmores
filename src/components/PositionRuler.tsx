/**
 * Régua embaixo do 3D — cada recorte é uma pastilha arrastável ao longo do
 * comprimento da peça. Abas por tipo (Área molhada / Cuba / Cooktop / Furo).
 * Inspirado no simuladormarmoraria.com.br.
 */
import { useMemo, useRef, useState } from "react";
import type { Recorte } from "@/domain/project";
import { mmParaMetrosLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

function grupo(t: Recorte["tipo"]): string {
  if (t === "area_molhada") return "Área molhada";
  if (t === "cooktop") return "Cooktop";
  if (t.startsWith("furo")) return "Furo";
  return "Cuba";
}

export function PositionRuler() {
  const recortes = useProjectStore((s) => s.projeto.recortes);
  const trechos = useProjectStore((s) => s.projeto.bancada.trechos);
  const updateRecorte = useProjectStore((s) => s.updateRecorte);
  const trackRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<string | null>(null);

  const tabs = useMemo(
    () => [...new Set(recortes.map((r) => grupo(r.tipo)))],
    [recortes],
  );
  const tabAtiva = tab && tabs.includes(tab) ? tab : tabs[0] ?? null;
  const visiveis = recortes.filter((r) => grupo(r.tipo) === tabAtiva);

  if (recortes.length === 0) return null;

  const comprimento = trechos[0]?.comprimento ?? 2000;

  const posInfo = (r: Recorte) => {
    const larg = r.diametro ?? r.largura;
    const maxIni = Math.max(comprimento - larg, 0);
    const ini = r.posicao.centralizada
      ? maxIni / 2
      : Math.min(Math.max(r.posicao.distanciaInicio, 0), maxIni);
    return { larg, maxIni, ini };
  };

  const arrastar = (r: Recorte, e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const { larg, maxIni } = posInfo(r);
    const mover = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const frac = (clientX - rect.left) / rect.width;
      const centroMm = frac * comprimento;
      const ini = Math.round(Math.min(Math.max(centroMm - larg / 2, 0), maxIni) / 5) * 5;
      updateRecorte(r.id, {
        posicao: { ...r.posicao, centralizada: false, distanciaInicio: ini },
      });
    };
    mover(e.clientX);
    const onMove = (ev: PointerEvent) => mover(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="regua">
      {tabs.length > 1 && (
        <div className="regua__tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={t === tabAtiva ? "is-active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="regua__linha">
        <span className="regua__cota">0,00 m</span>
        <div className="regua__track" ref={trackRef}>
          {visiveis.map((r) => {
            const { larg, ini } = posInfo(r);
            const left = (ini / comprimento) * 100;
            const width = (larg / comprimento) * 100;
            const centro = ini + larg / 2;
            return (
              <div
                key={r.id}
                className="regua__pill"
                style={{ left: `${left}%`, width: `${width}%` }}
                onPointerDown={(e) => arrastar(r, e)}
                title={`${grupo(r.tipo)} · ${mmParaMetrosLabel(centro)} m`}
              >
                <span className="regua__handle" />
              </div>
            );
          })}
        </div>
        <span className="regua__cota">{mmParaMetrosLabel(comprimento)} m</span>
      </div>
    </div>
  );
}
