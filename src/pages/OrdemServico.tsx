/**
 * Ordem de serviço para a oficina (especificação, seção 10).
 * Mesmo JSON, SEM valores. É o documento que evita o prejuízo: cortar errado
 * queima uma chapa inteira.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Drawing2D } from "@/components/Drawing2D";
import { MATERIAIS } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { contornoBancada, geometriaRecorte } from "@/domain/geometry";
import { mmParaCmLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

const LETRA = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function OrdemServico() {
  const projeto = useProjectStore((s) => s.projeto);
  const empresa = useProjectStore((s) => s.tabela.empresa);
  const material = MATERIAIS.find((m) => m.id === projeto.material?.id);

  const { segmentos } = useMemo(
    () => contornoBancada(projeto.bancada),
    [projeto.bancada],
  );

  const hoje = new Date();

  return (
    <div className="proposta-wrap">
      <div className="proposta-bar app-ui">
        <Link to="/editor" className="btn-ghost">← Voltar ao projeto</Link>
        <button className="btn-primario" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <article className="documento">
        <header className="doc__head">
          <div>
            <h1>Ordem de Serviço — Oficina</h1>
            <p>{empresa.nome}</p>
          </div>
          <div className="doc__num">
            <strong>{projeto.numero ?? "S/N"}</strong>
            <p>{hoje.toLocaleDateString("pt-BR")}</p>
            <p>{projeto.nome || "Projeto sem identificação"}</p>
          </div>
        </header>

        <section className="doc__bloco nao-quebrar">
          <h2>Peça</h2>
          <table className="doc__spec">
            <tbody>
              <tr><th>Ambiente</th><td>{AMBIENTE_LABEL[projeto.ambiente]}</td></tr>
              <tr><th>Formato</th><td>{FORMATO_LABEL[projeto.bancada.formato]}</td></tr>
              <tr><th>Espessura de corte</th><td>{projeto.bancada.espessura} mm</td></tr>
              <tr>
                <th>Chapa</th>
                <td>
                  {material?.nome ?? "— definir —"}
                  {material && ` (${material.chapa.largura} × ${material.chapa.altura} mm)`}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="doc__desenho nao-quebrar">
          <Drawing2D projeto={projeto} />
        </section>

        <section className="doc__bloco nao-quebrar">
          <h2>Bordas</h2>
          <table className="doc__valores">
            <thead>
              <tr><th>Borda</th><th>Comprimento</th><th>Acabamento</th></tr>
            </thead>
            <tbody>
              {segmentos.map((s, i) => (
                <tr key={i}>
                  <td>{LETRA[i]}{s.trecho >= 0 ? ` · trecho ${LETRA[s.trecho]}` : ""}</td>
                  <td>{mmParaCmLabel(s.comprimento)}</td>
                  <td>
                    {s.parede
                      ? "contra a parede — sem acabamento"
                      : projeto.acabamentoBorda.tipo.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="doc__bloco nao-quebrar">
          <h2>Recortes — cotados a partir da borda</h2>
          {projeto.recortes.length === 0 ? (
            <p>Nenhum recorte.</p>
          ) : (
            <table className="doc__valores">
              <thead>
                <tr>
                  <th>Recorte</th><th>Medida</th><th>Do início do trecho</th><th>Recuo frontal</th>
                </tr>
              </thead>
              <tbody>
                {projeto.recortes.map((r) => {
                  const g = geometriaRecorte(projeto, r);
                  const t = projeto.bancada.trechos[Math.min(r.posicao.trecho, projeto.bancada.trechos.length - 1)];
                  const largura = r.diametro ?? r.largura;
                  const inicio = r.posicao.centralizada
                    ? (t.comprimento - largura) / 2
                    : r.posicao.distanciaInicio;
                  const prof = r.diametro ?? r.profundidade;
                  const recuo = r.posicao.recuoFrontal ?? (t.profundidade - prof) / 2;
                  return (
                    <tr key={r.id}>
                      <td>
                        {r.tipo.replace(/_/g, " ")}
                        {r.canto ? ` (${r.canto})` : ""}
                      </td>
                      <td>
                        {r.diametro
                          ? `Ø ${r.diametro} mm`
                          : `${mmParaCmLabel(r.largura)} × ${mmParaCmLabel(r.profundidade)}`}
                      </td>
                      <td>
                        {mmParaCmLabel(inicio)}
                        {r.posicao.centralizada ? " (centralizado)" : ""}
                        {" · trecho "}{LETRA[r.posicao.trecho] ?? "A"}
                      </td>
                      <td>{mmParaCmLabel(recuo)} · centro ({Math.round(g.centro.x)}, {Math.round(g.centro.y)})</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {projeto.complementos.length > 0 && (
          <section className="doc__bloco nao-quebrar">
            <h2>Complementos</h2>
            <table className="doc__valores">
              <tbody>
                {projeto.complementos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.tipo}</td>
                    <td>altura {mmParaCmLabel(c.altura)} · trechos {c.trechos.map((i) => LETRA[i]).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="doc__bloco nao-quebrar doc__assinatura">
          <div><span>Conferido por</span><div className="doc__linha" /></div>
          <div><span>Data</span><div className="doc__linha" /></div>
        </section>
      </article>
    </div>
  );
}
