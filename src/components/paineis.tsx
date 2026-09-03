/**
 * Painéis flutuantes do palco:
 *  - esquerda: componentes (recortes) + acabamento de borda
 *  - direita: lista de pedras com amostra redonda e preço
 */
import { CANTO_AREA_MOLHADA_LABEL, CUBAS, MATERIAIS } from "@/domain/catalogo";
import type { TipoAcabamentoBorda } from "@/domain/project";
import { brl } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import { CampoCm } from "./campos";

const ACABAMENTOS: { value: TipoAcabamentoBorda; label: string }[] = [
  { value: "reto", label: "Reto" },
  { value: "boleado", label: "Boleado" },
  { value: "meia_cana", label: "Meia-cana" },
  { value: "bisote", label: "Bisotê" },
  { value: "meia_esquadria", label: "Meia-esquadria" },
];

export function PainelPedras() {
  const materialId = useProjectStore((s) => s.projeto.material?.id);
  const setMaterial = useProjectStore((s) => s.setMaterial);

  return (
    <div className="pedras-lista">
      {MATERIAIS.map((m) => (
        <button
          key={m.id}
          className={`pedra-row ${m.id === materialId ? "is-active" : ""}`}
          onClick={() => setMaterial(m)}
        >
          <span className="pedra-row__swatch" style={{ background: m.corFallback }} />
          <span className="pedra-row__txt">
            <strong>{m.nome}</strong>
            <em>{brl(m.precoM2)}/m²</em>
          </span>
        </button>
      ))}
    </div>
  );
}

export function PainelComponentes() {
  const recortes = useProjectStore((s) => s.projeto.recortes);
  const trechos = useProjectStore((s) => s.projeto.bancada.trechos);
  const acabamento = useProjectStore((s) => s.projeto.acabamentoBorda);
  const tabela = useProjectStore((s) => s.tabela);
  const addRecorte = useProjectStore((s) => s.addRecorte);
  const removeRecorte = useProjectStore((s) => s.removeRecorte);
  const updateRecorte = useProjectStore((s) => s.updateRecorte);
  const setAcabamento = useProjectStore((s) => s.setAcabamento);

  const areasMolhadas = recortes.filter((r) => r.tipo === "area_molhada");

  return (
    <div className="painel-l">
      <div className="painel-l__grupo">
        <span className="painel-l__titulo">Componentes</span>
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
            + Furo
          </button>
        </div>
      </div>

      {recortes.map((r) => (
        <div key={r.id} className="comp-item">
          <div className="comp-item__head">
            <strong>{rotulo(r.tipo)}</strong>
            <button className="link-remover" onClick={() => removeRecorte(r.id)}>
              remover
            </button>
          </div>

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

          {r.diametro == null ? (
            <div className="comp-item__medidas">
              <CampoCm
                label="Largura"
                valueMm={r.largura}
                onChangeMm={(mm) => updateRecorte(r.id, { largura: mm })}
                max={300}
              />
              <CampoCm
                label="Profundidade"
                valueMm={r.profundidade}
                onChangeMm={(mm) => updateRecorte(r.id, { profundidade: mm })}
                max={120}
              />
            </div>
          ) : (
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
          )}

          <label className="check">
            <input
              type="checkbox"
              checked={r.posicao.centralizada}
              onChange={(e) =>
                updateRecorte(r.id, { posicao: { ...r.posicao, centralizada: e.target.checked } })
              }
            />
            Centralizar no trecho
          </label>

          {!r.posicao.centralizada && (
            <CampoCm
              label="Distância do início"
              valueMm={r.posicao.distanciaInicio}
              onChangeMm={(mm) =>
                updateRecorte(r.id, { posicao: { ...r.posicao, distanciaInicio: mm } })
              }
              max={800}
            />
          )}
        </div>
      ))}

      <div className="painel-l__grupo">
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
      </div>
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
