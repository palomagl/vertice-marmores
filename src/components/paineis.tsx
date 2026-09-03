/**
 * Os quatro painéis laterais (especificação, seção 4.1):
 * Pedras · Componentes · Medidas · Ambientes.
 */
import { AMBIENTE_LABEL, FORMATO_LABEL, PRESETS } from "@/domain/presets";
import type { Ambiente, Formato, TipoAcabamentoBorda } from "@/domain/project";
import { MATERIAIS, CUBAS, CANTO_AREA_MOLHADA_LABEL } from "@/domain/catalogo";
import { brl } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import { CampoCm, Segmented } from "./campos";

const FORMATOS: Formato[] = ["linear", "L", "P", "U"];
const AMBIENTES: Ambiente[] = ["pia", "gourmet", "banheiro", "ilha", "balcao"];
const ACABAMENTOS: { value: TipoAcabamentoBorda; label: string }[] = [
  { value: "reto", label: "Reto" },
  { value: "boleado", label: "Boleado" },
  { value: "meia_cana", label: "Meia-cana" },
  { value: "bisote", label: "Bisotê" },
  { value: "meia_esquadria", label: "Meia-esquadria" },
];

export function PainelAmbientes() {
  const ambiente = useProjectStore((s) => s.projeto.ambiente);
  const aplicarAmbiente = useProjectStore((s) => s.aplicarAmbiente);

  return (
    <div className="painel">
      <p className="painel__hint">
        Escolha o tipo de serviço — o app já carrega profundidade, altura e
        complementos certos.
      </p>
      <div className="grid-ambientes">
        {AMBIENTES.map((a) => (
          <button
            key={a}
            className={`card-ambiente ${a === ambiente ? "is-active" : ""}`}
            onClick={() => aplicarAmbiente(a)}
          >
            <strong>{AMBIENTE_LABEL[a]}</strong>
            <span>{PRESETS[a].descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PainelMedidas() {
  const bancada = useProjectStore((s) => s.projeto.bancada);
  const setFormato = useProjectStore((s) => s.setFormato);
  const setTrecho = useProjectStore((s) => s.setTrecho);
  const setEspessura = useProjectStore((s) => s.setEspessura);
  const acabamento = useProjectStore((s) => s.projeto.acabamentoBorda);
  const setAcabamento = useProjectStore((s) => s.setAcabamento);
  const tabela = useProjectStore((s) => s.tabela);

  const nomesTrecho = ["A", "B", "C"];

  return (
    <div className="painel">
      <div className="painel__grupo">
        <label className="painel__titulo">Formato</label>
        <Segmented
          value={bancada.formato as Formato}
          options={FORMATOS.map((f) => ({ value: f, label: FORMATO_LABEL[f] }))}
          onChange={setFormato}
        />
      </div>

      <div className="painel__grupo">
        <label className="painel__titulo">Medidas dos trechos</label>
        {bancada.trechos.map((t, i) => (
          <div key={i} className="trecho">
            {bancada.trechos.length > 1 && (
              <span className="trecho__tag">Trecho {nomesTrecho[i]}</span>
            )}
            <CampoCm
              label="Comprimento"
              valueMm={t.comprimento}
              onChangeMm={(mm) => setTrecho(i, { comprimento: mm })}
              max={800}
            />
            <CampoCm
              label="Profundidade"
              valueMm={t.profundidade}
              onChangeMm={(mm) => setTrecho(i, { profundidade: mm })}
              max={200}
            />
          </div>
        ))}
      </div>

      <div className="painel__grupo">
        <label className="painel__titulo">Espessura da pedra</label>
        <Segmented
          value={String(bancada.espessura)}
          options={[
            { value: "20", label: "2 cm" },
            { value: "30", label: "3 cm" },
          ]}
          onChange={(v) => setEspessura(Number(v))}
        />
      </div>

      <div className="painel__grupo">
        <label className="painel__titulo">Acabamento de borda</label>
        <div className="lista-opcoes">
          {ACABAMENTOS.map((o) => (
            <button
              key={o.value}
              className={`opcao ${acabamento.tipo === o.value ? "is-active" : ""}`}
              onClick={() =>
                setAcabamento({
                  tipo: o.value,
                  precoMetroLinear: tabela.acabamentoBorda[o.value],
                })
              }
            >
              <span>{o.label}</span>
              <em>{brl(tabela.acabamentoBorda[o.value])}/m</em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PainelPedras() {
  const materialId = useProjectStore((s) => s.projeto.material?.id);
  const setMaterial = useProjectStore((s) => s.setMaterial);

  return (
    <div className="painel">
      <p className="painel__hint">
        Grid do estoque real da DF. As cores são provisórias até as fotos das
        chapas chegarem.
      </p>
      <div className="grid-pedras">
        {MATERIAIS.map((m) => (
          <button
            key={m.id}
            className={`card-pedra ${m.id === materialId ? "is-active" : ""}`}
            onClick={() => setMaterial(m)}
          >
            <span
              className="card-pedra__amostra"
              style={{ background: m.corFallback }}
            />
            <strong>{m.nome}</strong>
            <em>{brl(m.precoM2)}/m²</em>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PainelComponentes() {
  const recortes = useProjectStore((s) => s.projeto.recortes);
  const trechos = useProjectStore((s) => s.projeto.bancada.trechos);
  const addRecorte = useProjectStore((s) => s.addRecorte);
  const removeRecorte = useProjectStore((s) => s.removeRecorte);
  const updateRecorte = useProjectStore((s) => s.updateRecorte);

  const areasMolhadas = recortes.filter((r) => r.tipo === "area_molhada");

  return (
    <div className="painel">
      <div className="painel__grupo">
        <label className="painel__titulo">Adicionar</label>
        <div className="lista-opcoes">
          <button
            className="opcao"
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
            + Área molhada{areasMolhadas.length > 0 ? ` ${areasMolhadas.length + 1}` : ""}
          </button>
          <button
            className="opcao"
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
            + Cuba de embutir
          </button>
          <button
            className="opcao"
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
            className="opcao"
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
            + Furo de torneira
          </button>
        </div>
      </div>

      {recortes.length > 0 && (
        <div className="painel__grupo">
          <label className="painel__titulo">Na peça</label>
          {recortes.map((r) => (
            <div key={r.id} className="recorte-item">
              <div className="recorte-item__head">
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
                      updateRecorte(r.id, {
                        posicao: { ...r.posicao, trecho: Number(e.target.value) },
                      })
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
                <div className="lista-opcoes lista-opcoes--sm">
                  {(["retangular", "arredondado", "oval"] as const).map((c) => (
                    <button
                      key={c}
                      className={`opcao ${r.canto === c ? "is-active" : ""}`}
                      onClick={() => updateRecorte(r.id, { canto: c })}
                    >
                      {CANTO_AREA_MOLHADA_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}

              {r.diametro == null ? (
                <div className="recorte-item__medidas">
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
                    updateRecorte(r.id, {
                      posicao: { ...r.posicao, centralizada: e.target.checked },
                    })
                  }
                />
                Centralizar no trecho
              </label>

              {!r.posicao.centralizada && (
                <CampoCm
                  label="Distância do início"
                  valueMm={r.posicao.distanciaInicio}
                  onChangeMm={(mm) =>
                    updateRecorte(r.id, {
                      posicao: { ...r.posicao, distanciaInicio: mm },
                    })
                  }
                  max={800}
                />
              )}
            </div>
          ))}
        </div>
      )}
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
