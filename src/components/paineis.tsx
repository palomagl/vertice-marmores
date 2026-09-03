/**
 * Painéis flutuantes do palco:
 *  - esquerda (PainelCaracteristicas): peça, acabamento, frontão e saia por lado,
 *    e cada recorte nos mínimos detalhes
 *  - direita (PainelPedras): catálogo de pedras por família, com amostra e preço
 */
import { useState } from "react";
import {
  CANTO_AREA_MOLHADA_LABEL,
  CUBAS,
  FAMILIAS,
  MATERIAIS,
  type Familia,
} from "@/domain/catalogo";
import type { Lado, TipoAcabamentoBorda } from "@/domain/project";
import { brl } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import { CampoCm, SliderCm, SliderMm } from "./campos";

const ACABAMENTOS: { value: TipoAcabamentoBorda; label: string }[] = [
  { value: "reto", label: "Reto" },
  { value: "boleado", label: "Boleado" },
  { value: "meia_cana", label: "Meia-cana" },
  { value: "bisote", label: "Bisotê" },
  { value: "meia_esquadria", label: "Meia-esquadria" },
];

const LADOS_FRONTAO: { lado: Lado; label: string }[] = [
  { lado: "traseiro", label: "Traseiro" },
  { lado: "esquerdo", label: "Esquerdo" },
  { lado: "direito", label: "Direito" },
];
const LADOS_SAIA: { lado: Lado; label: string }[] = [
  { lado: "frontal", label: "Frontal" },
  { lado: "traseiro", label: "Traseira" },
  { lado: "esquerdo", label: "Esquerda" },
  { lado: "direito", label: "Direita" },
];

// ===================== Pedras =====================

export function PainelPedras() {
  const materialId = useProjectStore((s) => s.projeto.material?.id);
  const setMaterial = useProjectStore((s) => s.setMaterial);
  const [filtro, setFiltro] = useState<Familia | "todas">("todas");

  const familias = filtro === "todas" ? FAMILIAS : [filtro];

  return (
    <div className="pedras">
      <div className="pedras__filtros">
        <button
          className={`chip ${filtro === "todas" ? "is-active" : ""}`}
          onClick={() => setFiltro("todas")}
        >
          Todas
        </button>
        {FAMILIAS.map((f) => (
          <button
            key={f}
            className={`chip ${filtro === f ? "is-active" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="pedras__lista">
        {familias.map((fam) => (
          <div key={fam} className="pedras__grupo">
            <div className="pedras__grupo-tit">{fam}</div>
            {MATERIAIS.filter((m) => m.familia === fam).map((m) => (
              <button
                key={m.id}
                className={`pedra-row ${m.id === materialId ? "is-active" : ""}`}
                onClick={() => setMaterial(m)}
              >
                <span
                  className="pedra-row__swatch"
                  style={{ backgroundImage: `url(${m.swatch})` }}
                />
                <span className="pedra-row__txt">
                  <strong>{m.nome}</strong>
                  <em>{brl(m.precoM2)}/m²</em>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== Características (esquerda) =====================

export function PainelComponentes() {
  const bancada = useProjectStore((s) => s.projeto.bancada);
  const complementos = useProjectStore((s) => s.projeto.complementos);
  const recortes = useProjectStore((s) => s.projeto.recortes);
  const trechos = bancada.trechos;
  const acabamento = useProjectStore((s) => s.projeto.acabamentoBorda);
  const tabela = useProjectStore((s) => s.tabela);

  const setEspessura = useProjectStore((s) => s.setEspessura);
  const setAlturaInstalacao = useProjectStore((s) => s.setAlturaInstalacao);
  const setAcabamento = useProjectStore((s) => s.setAcabamento);
  const setAbaLado = useProjectStore((s) => s.setAbaLado);
  const setAbaReforco = useProjectStore((s) => s.setAbaReforco);
  const addRecorte = useProjectStore((s) => s.addRecorte);
  const removeRecorte = useProjectStore((s) => s.removeRecorte);
  const updateRecorte = useProjectStore((s) => s.updateRecorte);

  const aba = (tipo: "frontao" | "saia", lado: Lado) =>
    complementos.find((c) => c.tipo === tipo && c.lado === lado);

  const areasMolhadas = recortes.filter((r) => r.tipo === "area_molhada");

  return (
    <div className="painel-l">
      {/* ---- Peça ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Peça</span>
        <div className="linha2">
          <div className="campo">
            <span className="campo__label">Espessura</span>
            <div className="segmented">
              {[20, 30].map((mm) => (
                <button
                  key={mm}
                  className={bancada.espessura === mm ? "is-active" : ""}
                  onClick={() => setEspessura(mm)}
                >
                  {mm / 10} cm
                </button>
              ))}
            </div>
          </div>
        </div>
        <SliderCm
          label="Altura de instalação"
          valueMm={bancada.alturaInstalacao}
          onChangeMm={setAlturaInstalacao}
          minMm={700}
          maxMm={1100}
          stepMm={10}
        />
      </section>

      {/* ---- Acabamento ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Acabamento de borda</span>
        <div className="chips">
          {ACABAMENTOS.map((o) => (
            <button
              key={o.value}
              className={`chip ${acabamento.tipo === o.value ? "is-active" : ""}`}
              onClick={() =>
                setAcabamento({ tipo: o.value, precoMetroLinear: tabela.acabamentoBorda[o.value] })
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---- Frontão ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Frontão</span>
        {LADOS_FRONTAO.map(({ lado, label }) => {
          const c = aba("frontao", lado);
          return (
            <div key={lado} className="aba-lado">
              <SliderMm
                label={label}
                valueMm={c?.altura ?? 0}
                onChangeMm={(mm) => setAbaLado("frontao", lado, mm)}
                minMm={0}
                maxMm={300}
              />
              {c && (
                <label className="check check--sm">
                  <input
                    type="checkbox"
                    checked={!!c.reforco}
                    onChange={(e) => setAbaReforco("frontao", lado, e.target.checked)}
                  />
                  Reforço
                </label>
              )}
            </div>
          );
        })}
      </section>

      {/* ---- Saia ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Saia</span>
        {LADOS_SAIA.map(({ lado, label }) => {
          const c = aba("saia", lado);
          return (
            <div key={lado} className="aba-lado">
              <SliderMm
                label={label}
                valueMm={c?.altura ?? 0}
                onChangeMm={(mm) => setAbaLado("saia", lado, mm)}
                minMm={0}
                maxMm={250}
              />
              {c && (
                <label className="check check--sm">
                  <input
                    type="checkbox"
                    checked={!!c.reforco}
                    onChange={(e) => setAbaReforco("saia", lado, e.target.checked)}
                  />
                  Reforço da saia
                </label>
              )}
            </div>
          );
        })}
      </section>

      {/* ---- Recortes ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Recortes</span>
        <div className="chips">
          <button
            className="chip"
            onClick={() =>
              addRecorte({
                tipo: "area_molhada",
                largura: 1000,
                profundidade: 450,
                canto: "arredondado",
                posicao: { trecho: 0, distanciaInicio: 0, centralizada: true },
              })
            }
          >
            + Área molhada{areasMolhadas.length ? ` ${areasMolhadas.length + 1}` : ""}
          </button>
          <button
            className="chip"
            onClick={() =>
              addRecorte({
                tipo: "cuba_embutir",
                modelo: CUBAS[0].id,
                largura: CUBAS[0].largura,
                profundidade: CUBAS[0].profundidade,
                posicao: { trecho: 0, distanciaInicio: 500, centralizada: false },
              })
            }
          >
            + Cuba
          </button>
          <button
            className="chip"
            onClick={() =>
              addRecorte({
                tipo: "cooktop",
                largura: 580,
                profundidade: 500,
                posicao: { trecho: 0, distanciaInicio: 0, centralizada: true },
              })
            }
          >
            + Cooktop
          </button>
          <button
            className="chip"
            onClick={() =>
              addRecorte({
                tipo: "furo_torneira",
                largura: 35,
                profundidade: 35,
                diametro: 35,
                posicao: { trecho: 0, distanciaInicio: 120, centralizada: false, recuoFrontal: 60 },
              })
            }
          >
            + Furo torneira
          </button>
          <button
            className="chip"
            onClick={() =>
              addRecorte({
                tipo: "furo_dosador",
                largura: 30,
                profundidade: 30,
                diametro: 30,
                posicao: { trecho: 0, distanciaInicio: 200, centralizada: false, recuoFrontal: 60 },
              })
            }
          >
            + Furo dosador
          </button>
        </div>

        {recortes.map((r) => {
          const ehFuro = r.diametro != null;
          const ehCuba = r.tipo === "cuba_embutir" || r.tipo === "cuba_sobrepor";
          return (
            <div key={r.id} className="comp-item">
              <div className="comp-item__head">
                <strong>{rotulo(r.tipo)}</strong>
                <button className="link-remover" onClick={() => removeRecorte(r.id)}>
                  remover
                </button>
              </div>

              {ehCuba && (
                <label className="campo campo--inline">
                  <span className="campo__label">Modelo</span>
                  <select
                    value={r.modelo}
                    onChange={(e) => {
                      const cuba = CUBAS.find((c) => c.id === e.target.value);
                      if (cuba)
                        updateRecorte(r.id, {
                          modelo: cuba.id,
                          tipo: cuba.tipo,
                          largura: cuba.largura,
                          profundidade: cuba.profundidade,
                        });
                    }}
                  >
                    {CUBAS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {trechos.length > 1 && (
                <label className="campo campo--inline">
                  <span className="campo__label">Trecho</span>
                  <select
                    value={r.posicao.trecho}
                    onChange={(e) =>
                      updateRecorte(r.id, { posicao: { ...r.posicao, trecho: Number(e.target.value) } })
                    }
                  >
                    {trechos.map((_, i) => (
                      <option key={i} value={i}>
                        {["A", "B", "C"][i]}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {r.tipo === "area_molhada" && (
                <div className="chips chips--sm">
                  {(["retangular", "arredondado", "oval"] as const).map((c) => (
                    <button
                      key={c}
                      className={`chip ${r.canto === c ? "is-active" : ""}`}
                      onClick={() => updateRecorte(r.id, { canto: c })}
                    >
                      {CANTO_AREA_MOLHADA_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}

              {ehFuro ? (
                <label className="campo campo--inline">
                  <span className="campo__label">Diâmetro (mm)</span>
                  <input
                    type="number"
                    value={r.diametro}
                    onChange={(e) =>
                      updateRecorte(r.id, {
                        diametro: Number(e.target.value),
                        largura: Number(e.target.value),
                        profundidade: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ) : (
                <div className="comp-item__medidas">
                  <CampoCm
                    label="Largura"
                    valueMm={r.largura}
                    onChangeMm={(mm) => updateRecorte(r.id, { largura: mm })}
                    max={400}
                  />
                  <CampoCm
                    label="Profundidade"
                    valueMm={r.profundidade}
                    onChangeMm={(mm) => updateRecorte(r.id, { profundidade: mm })}
                    max={150}
                  />
                </div>
              )}

              <label className="check check--sm">
                <input
                  type="checkbox"
                  checked={r.posicao.centralizada}
                  onChange={(e) =>
                    updateRecorte(r.id, { posicao: { ...r.posicao, centralizada: e.target.checked } })
                  }
                />
                Centralizar no comprimento
              </label>

              {!r.posicao.centralizada && (
                <CampoCm
                  label="Distância do início do trecho"
                  valueMm={r.posicao.distanciaInicio}
                  onChangeMm={(mm) =>
                    updateRecorte(r.id, { posicao: { ...r.posicao, distanciaInicio: mm } })
                  }
                  max={1000}
                />
              )}

              <CampoCm
                label="Recuo da borda frontal"
                valueMm={r.posicao.recuoFrontal ?? 0}
                onChangeMm={(mm) =>
                  updateRecorte(r.id, { posicao: { ...r.posicao, recuoFrontal: mm } })
                }
                max={100}
              />
            </div>
          );
        })}
      </section>
    </div>
  );
}

function rotulo(t: string): string {
  const m: Record<string, string> = {
    area_molhada: "Área molhada",
    cuba_embutir: "Cuba de embutir",
    cuba_sobrepor: "Cuba de sobrepor",
    cooktop: "Cooktop",
    furo_torneira: "Furo de torneira",
    furo_dosador: "Furo de dosador",
  };
  return m[t] ?? t;
}
