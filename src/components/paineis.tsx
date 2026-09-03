/**
 * Painéis flutuantes do palco:
 *  - esquerda (PainelCaracteristicas): peça, acabamento, frontão e saia por lado,
 *    e cada recorte nos mínimos detalhes
 *  - direita (PainelPedras): catálogo de pedras por família, com amostra e preço
 */
import { useEffect, useState } from "react";
import { CUBAS, FAMILIAS, MATERIAIS, type Familia } from "@/domain/catalogo";
import type {
  Lado,
  PosicaoRecorte,
  Recorte,
  TipoAcabamentoBorda,
} from "@/domain/project";
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
                  style={{ backgroundImage: `url(${m.texturaUrl}), url(${m.swatch})` }}
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

  const [abertoRec, setAbertoRec] = useState<string | null>(null);
  // abre automaticamente o último recorte adicionado
  useEffect(() => {
    setAbertoRec(recortes[recortes.length - 1]?.id ?? null);
  }, [recortes.length]);

  const aba = (tipo: "frontao" | "saia", lado: Lado) =>
    complementos.find((c) => c.tipo === tipo && c.lado === lado);

  const areasMolhadas = recortes.filter((r) => r.tipo === "area_molhada");

  // posição escalonada para novos recortes não empilharem
  const prox = (base: number) => {
    const limite = Math.max((trechos[0]?.comprimento ?? 2000) - 700, base);
    return Math.min(base + recortes.length * 450, limite);
  };

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

      {/* ---- Saia / painel lateral ---- */}
      <section className="painel-l__grupo">
        <span className="painel-l__titulo">Saia / painel lateral</span>
        {LADOS_SAIA.map(({ lado, label }) => {
          const c = aba("saia", lado);
          return (
            <div key={lado} className="aba-lado">
              <SliderMm
                label={label}
                valueMm={c?.altura ?? 0}
                onChangeMm={(mm) => setAbaLado("saia", lado, mm)}
                minMm={0}
                maxMm={1000}
                stepMm={10}
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
                posicao: { trecho: 0, distanciaInicio: prox(400), centralizada: false },
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
                canto: "retangular",
                posicao: { trecho: 0, distanciaInicio: prox(200), centralizada: false },
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
                posicao: { trecho: 0, distanciaInicio: prox(300), centralizada: false },
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
                posicao: { trecho: 0, distanciaInicio: prox(120), centralizada: false, recuoFrontal: 60 },
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
                posicao: { trecho: 0, distanciaInicio: prox(200), centralizada: false, recuoFrontal: 60 },
              })
            }
          >
            + Furo dosador
          </button>
        </div>

        {recortes.map((r) => {
          const mesmoTipo = recortes.filter((x) => x.tipo === r.tipo);
          const n = mesmoTipo.length > 1 ? ` ${mesmoTipo.indexOf(r) + 1}` : "";
          const aberto = abertoRec === r.id;
          return (
            <div key={r.id} className={`comp-card ${aberto ? "is-open" : ""}`}>
              <button
                className="comp-card__head"
                onClick={() => setAbertoRec(aberto ? null : r.id)}
              >
                <span>{rotulo(r.tipo)}{n}</span>
                <span className="comp-card__chev">{aberto ? "▾" : "▸"}</span>
              </button>
              {aberto && (
                <RecorteEditor
                  r={r}
                  trechos={trechos}
                  onRemove={() => {
                    removeRecorte(r.id);
                    setAbertoRec(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

// ---- editor de um recorte (cuba, cooktop, área molhada, furo) ----

const FORMAS = [
  { c: "retangular", label: "Reto", ico: "▭" },
  { c: "arredondado", label: "Arred.", ico: "▢" },
  { c: "oval", label: "Oval", ico: "⬭" },
] as const;

function RecorteEditor({
  r,
  trechos,
  onRemove,
}: {
  r: Recorte;
  trechos: { comprimento: number; profundidade: number }[];
  onRemove: () => void;
}) {
  const updateRecorte = useProjectStore((s) => s.updateRecorte);
  const ehFuro = r.diametro != null;
  const ehCuba = r.tipo === "cuba_embutir" || r.tipo === "cuba_sobrepor";
  const t = trechos[Math.min(r.posicao.trecho, trechos.length - 1)];

  const larg = r.diametro ?? r.largura;
  const prof = r.diametro ?? r.profundidade;
  const maxIni = Math.max(t.comprimento - larg, 0);
  const ini = r.posicao.centralizada
    ? maxIni / 2
    : Math.min(Math.max(r.posicao.distanciaInicio, 0), maxIni);
  const maxRecuo = Math.max(t.profundidade - prof, 0);
  const recuo = Math.min(Math.max(r.posicao.recuoFrontal ?? maxRecuo / 2, 0), maxRecuo);

  const dLat = ini - maxIni / 2;
  const labelLat =
    Math.abs(dLat) < 20
      ? "Centralizada"
      : dLat < 0
        ? `${Math.round(-dLat / 10)} cm p/ esquerda`
        : `${Math.round(dLat / 10)} cm p/ direita`;
  const labelProf =
    Math.abs(recuo - maxRecuo / 2) < 20
      ? "Posição padrão"
      : recuo > maxRecuo / 2
        ? "mais para o fundo"
        : "mais para a frente";

  const setPos = (patch: Partial<PosicaoRecorte>) =>
    updateRecorte(r.id, { posicao: { ...r.posicao, ...patch } });

  return (
    <div className="comp-item">
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
            onChange={(e) => setPos({ trecho: Number(e.target.value) })}
          >
            {trechos.map((_, i) => (
              <option key={i} value={i}>
                {["A", "B", "C"][i]}
              </option>
            ))}
          </select>
        </label>
      )}

      {!ehFuro && (
        <div className="formas">
          {FORMAS.map((f) => (
            <button
              key={f.c}
              className={`forma ${(r.canto ?? "retangular") === f.c ? "is-active" : ""}`}
              onClick={() => updateRecorte(r.id, { canto: f.c })}
              title={f.label}
            >
              <span className="forma__ico">{f.ico}</span>
              {f.label}
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
            label="Comprimento"
            valueMm={r.profundidade}
            onChangeMm={(mm) => updateRecorte(r.id, { profundidade: mm })}
            max={150}
          />
        </div>
      )}

      <div className="slider slider--sm">
        <div className="slider__topo">
          <span>Posição lateral</span>
          <strong>{labelLat}</strong>
        </div>
        <div className="slider__ends">
          <em>esquerda</em>
          <input
            type="range"
            min={0}
            max={maxIni || 1}
            step={5}
            value={ini}
            onChange={(e) => setPos({ centralizada: false, distanciaInicio: Number(e.target.value) })}
          />
          <em>direita</em>
        </div>
      </div>

      <div className="slider slider--sm">
        <div className="slider__topo">
          <span>Posição (fundo ↔ frente)</span>
          <strong>{labelProf}</strong>
        </div>
        <div className="slider__ends">
          <em>fundo</em>
          <input
            type="range"
            min={0}
            max={maxRecuo || 1}
            step={5}
            value={maxRecuo - recuo}
            onChange={(e) => setPos({ recuoFrontal: maxRecuo - Number(e.target.value) })}
          />
          <em>frente</em>
        </div>
      </div>

      <button className="link-remover" onClick={onRemove}>
        remover
      </button>
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
