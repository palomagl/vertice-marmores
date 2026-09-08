/**
 * Régua embaixo do 3D — cada recorte é uma pastilha arrastável ao longo do
 * comprimento da peça. Abas por tipo (Área molhada / Cuba / Cooktop / Furo).
 * Inspirado no simuladormarmoraria.com.br.
 *
 * LIMITAÇÃO CONHECIDA (documentada, não escondida): a régua só entende UM
 * trecho por vez — ela é uma linha reta escalada pro comprimento de um único
 * trecho, então não dá pra desenhar corretamente uma peça em L/P/U inteira
 * numa régua só (os trechos formam ângulo de 90°, não ficam na mesma reta).
 * Em vez de fingir que funciona pra peça toda (o bug antigo: a régua sempre
 * usava a escala do trecho 0, então um recorte no trecho B/C aparecia na
 * posição errada quando os trechos tinham comprimentos diferentes), agora:
 *   - o trecho ativo fica EXPLÍCITO (seletor A/B/C quando há mais de um);
 *   - a régua mostra e escala só os recortes DAQUELE trecho;
 *   - recortes de outros trechos ficam ocultos aqui (mas continuam editáveis
 *     pelos campos numéricos do `RecorteEditor`, que sempre funcionam certo
 *     pra qualquer trecho).
 * Reescrever pra desenhar o contorno inteiro (L/P/U dobrado) é trabalho de
 * outra rodada — arriscado demais pra fazer com pressa.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [trechoAtivo, setTrechoAtivo] = useState(0);

  // se o formato mudou e o trecho ativo deixou de existir, volta pro 0
  useEffect(() => {
    if (trechoAtivo >= trechos.length) setTrechoAtivo(0);
  }, [trechos.length, trechoAtivo]);

  const doTrecho = useMemo(
    () => recortes.filter((r) => Math.min(r.posicao.trecho, trechos.length - 1) === trechoAtivo),
    [recortes, trechos.length, trechoAtivo],
  );
  const tabs = useMemo(
    () => [...new Set(doTrecho.map((r) => grupo(r.tipo)))],
    [doTrecho],
  );
  const tabAtiva = tab && tabs.includes(tab) ? tab : tabs[0] ?? null;
  const visiveis = doTrecho.filter((r) => grupo(r.tipo) === tabAtiva);

  if (recortes.length === 0) return null;

  const comprimento = trechos[trechoAtivo]?.comprimento ?? 2000;

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
      <div className="regua__topo">
        {trechos.length > 1 && (
          <div className="regua__trechos">
            <span>Trecho</span>
            {trechos.map((_, i) => (
              <button
                key={i}
                className={i === trechoAtivo ? "is-active" : ""}
                onClick={() => setTrechoAtivo(i)}
              >
                {NOME_TRECHO[i] ?? i + 1}
              </button>
            ))}
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
      {doTrecho.length === 0 ? (
        <p className="regua__vazio">
          Nenhum recorte no trecho {NOME_TRECHO[trechoAtivo] ?? trechoAtivo + 1} — troque de
          trecho acima pra ver/mover os recortes dele.
        </p>
      ) : (
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
      )}
    </div>
  );
}
