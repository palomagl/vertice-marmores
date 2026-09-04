/**
 * Orçamento ao vivo. No modo apresentação, some tudo que é custo/margem
 * (especificação, seção 8): o que o cliente vê é só o total.
 *
 * Sem pedra: mostra as linhas de mão de obra, mas no lugar do total vem o aviso.
 * Distância de entrega em km alimenta o frete (vazio = "a combinar").
 */
import { useMemo } from "react";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { brl, m2Label } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

export function PainelOrcamento() {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const apresentacao = useProjectStore((s) => s.apresentacao);
  const setDistanciaKm = useProjectStore((s) => s.setDistanciaKm);

  const orc = useMemo(
    () => calcularOrcamento(projeto, tabela),
    [projeto, tabela],
  );

  const margemBaixa =
    orc.interno.margemPct != null &&
    orc.interno.margemPct < tabela.margemMinimaPct;

  return (
    <div className="orcamento">
      <header className="orcamento__head">
        <span>Orçamento</span>
        {orc.completo ? (
          <strong>{rotuloTotal(orc)}</strong>
        ) : (
          <strong className="orcamento__sem-pedra">
            Selecione a pedra para ver o total
          </strong>
        )}
      </header>

      {!apresentacao && (
        <label className="orcamento__frete">
          <span>Distância da entrega (km)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="a combinar"
            value={projeto.distanciaKm ?? ""}
            onChange={(e) =>
              setDistanciaKm(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
          />
        </label>
      )}

      {!apresentacao && (
        <ul className="orcamento__itens">
          {orc.itens.map((i) => (
            <li key={i.chave}>
              <span className="orcamento__desc">
                {i.descricao}
                <em>{i.detalhe}</em>
              </span>
              <span className="orcamento__valor">
                {i.valor == null ? "a combinar" : brl(i.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!apresentacao && (
        <footer className="orcamento__interno">
          <span>Retângulo envolvente: {m2Label(orc.interno.areaEnvolventeM2)}</span>
          <span>Área real: {m2Label(orc.interno.areaRealM2)} ({orc.interno.aproveitamentoPct}%)</span>
          {orc.interno.custoMaterial != null && (
            <span>Custo do material: {brl(orc.interno.custoMaterial)}</span>
          )}
          {orc.interno.margemPct != null && (
            <span className={margemBaixa ? "alerta" : ""}>
              Margem: {orc.interno.margemPct}%
              {margemBaixa && ` — abaixo do mínimo (${tabela.margemMinimaPct}%)`}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}
