/**
 * Régua embaixo do 3D — cada recorte é uma pastilha arrastável ao longo do
 * comprimento da peça. Abas por tipo (Área molhada / Cuba / Cooktop / Furo).
 * Inspirado no simuladormarmoraria.com.br.
 *
 * Em L/P/U os trechos formam ângulo de 90° entre si — não dá pra desenhar
 * tudo numa única linha reta sem reescrever isso como um desenho dobrado
 * (fora de escopo, arriscado demais pra fazer com pressa). A solução aqui é
 * mais simples e ainda honesta: em vez de esconder os outros trechos atrás
 * de um seletor (como era antes — só um trecho visível por vez, o vendedor
 * precisava lembrar de trocar), cada trecho que TEM recorte ganha sua
 * própria régua, todas empilhadas e visíveis ao mesmo tempo, cada uma na
 * escala certa do seu próprio comprimento. Trecho sem recorte nenhum não
 * aparece aqui (nada pra arrastar) — mas continua editável pelos campos
 * numéricos do `RecorteEditor`, que sempre funcionam certo pra qualquer
 * trecho.
 */
import { useMemo, useRef, useState } from "react";
import type { Recorte } from "@/domain/project";
import { mmParaMetrosLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

const NOME_TRECHO = ["A", "B", "C"];

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

  const grupos = useMemo(() => {
    return trechos
      .map((t, i) => ({
        indice: i,
        comprimento: t.comprimento,
        recortes: recortes.filter(
          (r) => Math.min(r.posicao.trecho, trechos.length - 1) === i,
        ),
      }))
      .filter((g) => g.recortes.length > 0);
  }, [recortes, trechos]);

  if (grupos.length === 0) return null;

  return (
    <div className="regua-lista">
      {grupos.map((g) => (
        <ReguaDoTrecho
          key={g.indice}
          rotulo={trechos.length > 1 ? (NOME_TRECHO[g.indice] ?? String(g.indice + 1)) : null}
          comprimento={g.comprimento}
          recortes={g.recortes}
          onMover={(id, distanciaInicio) =>
            updateRecorte(id, {
              posicao: {
                ...g.recortes.find((r) => r.id === id)!.posicao,
                centralizada: false,
                distanciaInicio,
              },
            })
          }
        />
      ))}
    </div>
  );
}

/** Uma régua completa (abas por tipo + trilho arrastável) pra UM trecho. */
function ReguaDoTrecho({
  rotulo,
  comprimento,
  recortes,
  onMover,
}: {
  /** "A"/"B"/"C" — null quando a peça só tem 1 trecho (não precisa rotular) */
  rotulo: string | null;
  comprimento: number;
  recortes: Recorte[];
  onMover: (id: string, distanciaInicioMm: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<string | null>(null);

  const tabs = useMemo(() => [...new Set(recortes.map((r) => grupo(r.tipo)))], [recortes]);
  const tabAtiva = tab && tabs.includes(tab) ? tab : (tabs[0] ?? null);
  const visiveis = recortes.filter((r) => grupo(r.tipo) === tabAtiva);

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
      onMover(r.id, ini);
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
      <div className="regua__topo">
        {rotulo && (
          <div className="regua__trecho-rotulo">
            <span>Trecho</span>
            <strong>{rotulo}</strong>
          </div>
        )}
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
      </div>
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
