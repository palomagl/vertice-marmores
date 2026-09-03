/**
 * Orçamento ao vivo. No modo apresentação, some tudo que é custo/margem
 * (especificação, seção 8): o que o cliente vê é só o total.
 */
import { useMemo } from "react";
import { calcularOrcamento } from "@/domain/quote";
import { brl, m2Label } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

export function PainelOrcamento() {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const apresentacao = useProjectStore((s) => s.apresentacao);

  const orc = useMemo(
    () => calcularOrcamento(projeto, tabela),
    [projeto, tabela],
  );

  const margemBaixa =
    orc.interno.margemPct != null && orc.interno.margemPct < tabela.margemMinimaPct;

  return (
    <div className="orcamento">
      <header className="orcamento__head">
        <span>Orçamento</span>
        <strong>{brl(orc.total)}</strong>
      </header>

      {!apresentacao && (
        <ul className="orcamento__itens">
          {orc.itens.map((i) => (
            <li key={i.chave}>
              <span className="orcamento__desc">
                {i.descricao}
                <em>{i.detalhe}</em>
              </span>
              <span className="orcamento__valor">{brl(i.valor)}</span>
            </li>
          ))}
          {orc.itens.length === 0 && (
            <li className="orcamento__vazio">Escolha o material para ver os valores.</li>
          )}
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
