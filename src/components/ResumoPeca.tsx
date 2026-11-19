/**
 * Resumo da peça — só no desktop, embaixo do 3D.
 *
 * Numa tela grande sobra espaço; a ideia é usar ele para o vendedor não
 * precisar abrir painel nenhum para responder o que o cliente pergunta na
 * frente dele: que pedra é, que tamanho tem, quanto está dando.
 *
 * Três blocos e só. Não é um painel de ferramentas: aqui nada se edita,
 * tudo se lê. Clicar na pedra leva para a etapa de pedra, que é o atalho
 * que o vendedor mais usa quando o cliente muda de ideia.
 */
import { materialPorId } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { brl, mmParaCmLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import type { EtapaId } from "./EtapaRail";

export function ResumoPeca({ onIr }: { onIr: (etapa: EtapaId) => void }) {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const material = projeto.material ? materialPorId(projeto.material.id) : null;
  const orc = calcularOrcamento(projeto, tabela);

  const medidas = projeto.bancada.trechos
    .map((t) => mmParaCmLabel(t.comprimento))
    .join(" + ");
  const profundidade = mmParaCmLabel(projeto.bancada.trechos[0].profundidade);

  return (
    <aside className="resumo" aria-label="Resumo da peça">
      <button
        className="resumo__bloco resumo__pedra"
        onClick={() => onIr("pedra")}
        title="Trocar a pedra"
      >
        {material ? (
          <>
            <span
              className="resumo__swatch"
              style={{ backgroundImage: `url(${material.texturaUrl}), url(${material.swatch})` }}
            />
            <span className="resumo__txt">
              <small>Pedra</small>
              <strong>{material.nome}</strong>
              <em>{brl(material.precoM2)}/m²</em>
            </span>
          </>
        ) : (
          <>
            <span className="resumo__swatch resumo__swatch--vazio" />
            <span className="resumo__txt">
              <small>Pedra</small>
              <strong>Escolher pedra</strong>
              <em>sem pedra não há valor</em>
            </span>
          </>
        )}
      </button>

      <button
        className="resumo__bloco"
        onClick={() => onIr("medidas")}
        title="Ajustar as medidas"
      >
        <span className="resumo__txt">
          <small>{AMBIENTE_LABEL[projeto.ambiente]} · {FORMATO_LABEL[projeto.bancada.formato]}</small>
          <strong>{medidas}</strong>
          <em>prof. {profundidade} · esp. {projeto.bancada.espessura / 10} cm</em>
        </span>
      </button>

      <div className="resumo__bloco resumo__total">
        <span className="resumo__txt">
          <small>Total</small>
          {orc.completo ? (
            <strong>{rotuloTotal(orc)}</strong>
          ) : (
            <strong className="resumo__pendente">—</strong>
          )}
          <em>
            {orc.completo
              ? orc.fretePendente
                ? "frete a combinar"
                : "frete incluso"
              : "selecione a pedra"}
          </em>
        </span>
      </div>
    </aside>
  );
}
