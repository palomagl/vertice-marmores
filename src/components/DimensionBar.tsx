/**
 * Barra de medidas no topo do palco: pills de formato + alternância
 * Barrinha/Digitar + comprimento(s) e profundidade.
 */
import { useState } from "react";
import { FORMATO_LABEL } from "@/domain/presets";
import type { Formato } from "@/domain/project";
import { useProjectStore } from "@/store/projectStore";
import { CampoCm, SliderCm } from "./campos";

const FORMATOS: Formato[] = ["linear", "L", "P", "U"];
const NOME = ["A", "B", "C"];

export function DimensionBar() {
  const bancada = useProjectStore((s) => s.projeto.bancada);
  const setFormato = useProjectStore((s) => s.setFormato);
  const setTrecho = useProjectStore((s) => s.setTrecho);
  const [modo, setModo] = useState<"barra" | "digitar">("barra");

  const prof = bancada.trechos[0]?.profundidade ?? 600;
  const setProfTodos = (mm: number) =>
    bancada.trechos.forEach((_, i) => setTrecho(i, { profundidade: mm }));

  return (
    <div className="medidas-bar">
      <div className="medidas-bar__pills">
        {FORMATOS.map((f) => (
          <button
            key={f}
            className={`pill ${bancada.formato === f ? "is-active" : ""}`}
            onClick={() => setFormato(f)}
          >
            {FORMATO_LABEL[f]}
          </button>
        ))}
        <div className="medidas-bar__toggle">
          <button className={modo === "barra" ? "is-active" : ""} onClick={() => setModo("barra")}>
            Barrinha
          </button>
          <button className={modo === "digitar" ? "is-active" : ""} onClick={() => setModo("digitar")}>
            Digitar
          </button>
        </div>
      </div>

      <div className="medidas-bar__campos">
        {bancada.trechos.map((t, i) => (
          <div key={i} className="medidas-bar__campo">
            {modo === "barra" ? (
              <SliderCm
                label={bancada.trechos.length > 1 ? `Comprimento ${NOME[i]}` : "Comprimento"}
                valueMm={t.comprimento}
                onChangeMm={(mm) => setTrecho(i, { comprimento: mm })}
                minMm={300}
                maxMm={6000}
              />
            ) : (
              <CampoCm
                label={bancada.trechos.length > 1 ? `Comprimento ${NOME[i]}` : "Comprimento"}
                valueMm={t.comprimento}
                onChangeMm={(mm) => setTrecho(i, { comprimento: mm })}
                max={800}
              />
            )}
          </div>
        ))}
        <div className="medidas-bar__campo">
          {modo === "barra" ? (
            <SliderCm
              label="Profundidade"
              valueMm={prof}
              onChangeMm={setProfTodos}
              minMm={300}
              maxMm={1200}
            />
          ) : (
            <CampoCm label="Profundidade" valueMm={prof} onChangeMm={setProfTodos} max={200} />
          )}
        </div>
      </div>
    </div>
  );
}
