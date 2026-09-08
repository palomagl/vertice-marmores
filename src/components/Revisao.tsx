/**
 * Etapa de Revisão — mostrada antes de gerar o orçamento (modal, sobre o
 * configurador). Só leitura: nenhum cálculo mora aqui, tudo vem de
 * `calcularOrcamento` (quote.ts) e do `projeto` já existentes — a ideia é o
 * vendedor conferir tudo rapidamente antes de apresentar o preço pro cliente.
 *
 * Cada linha é clicável e chama `onEditar(aba)`, que fecha este modal e abre
 * a aba correspondente (mesma mecânica de bottom sheet já usada no celular),
 * então "editar" nunca é um beco sem saída.
 */
import { Link } from "react-router-dom";
import { materialPorId } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import type { Lado } from "@/domain/project";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { mmParaMetrosLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import type { EtapaId } from "./EtapaRail";
import { ACABAMENTOS, rotulo } from "./paineis";

const LADO_LABEL: Record<Lado, string> = {
  frontal: "Frontal",
  traseiro: "Traseira",
  esquerdo: "Esquerda",
  direito: "Direita",
};

export function Revisao({
  onFechar,
  onEditar,
}: {
  onFechar: () => void;
  onEditar: (etapa: EtapaId) => void;
}) {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);

  const mat = materialPorId(projeto.material?.id ?? undefined);
  const orc = calcularOrcamento(projeto, tabela);
  const trechos = projeto.bancada.trechos;
  const medidas = trechos.map((t) => mmParaMetrosLabel(t.comprimento)).join(" + ");
  const prof = mmParaMetrosLabel(trechos[0]?.profundidade ?? 0);

  const acabamento =
    ACABAMENTOS.find((a) => a.value === projeto.acabamentoBorda.tipo)?.label ??
    projeto.acabamentoBorda.tipo;

  const frontoes = projeto.complementos
    .filter((c) => c.tipo === "frontao" && c.altura > 0 && c.lado)
    .map((c) => LADO_LABEL[c.lado as Lado]);
  const saias = projeto.complementos
    .filter((c) => c.tipo === "saia" && c.altura > 0 && c.lado)
    .map((c) => LADO_LABEL[c.lado as Lado]);

  const recortesPorTipo = projeto.recortes.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] ?? 0) + 1;
    return acc;
  }, {});
  const recortesTxt = Object.entries(recortesPorTipo)
    .map(([tipo, n]) => `${rotulo(tipo)}${n > 1 ? ` ×${n}` : ""}`)
    .join(", ");

  return (
    <div className="modal-backdrop" onClick={onFechar}>
      <div className="modal modal--revisao" onClick={(e) => e.stopPropagation()}>
        <h2>Revisão</h2>
        <p className="revisao__sub">Confira antes de apresentar o orçamento ao cliente.</p>

        <div className="revisao__corpo">
          <button className="revisao__linha" onClick={() => onEditar("ambiente")}>
            <span>Ambiente</span>
            <strong>{AMBIENTE_LABEL[projeto.ambiente]}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("formato")}>
            <span>Formato</span>
            <strong>{FORMATO_LABEL[projeto.bancada.formato]}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("medidas")}>
            <span>Medidas</span>
            <strong>{medidas} m · prof. {prof} m</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("recortes")}>
            <span>Recortes</span>
            <strong>{recortesTxt || "Nenhum"}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("acabamentos")}>
            <span>Acabamento</span>
            <strong>{acabamento}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("acabamentos")}>
            <span>Frontão</span>
            <strong>{frontoes.length ? frontoes.join(", ") : "Nenhum"}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("acabamentos")}>
            <span>Saia / painel</span>
            <strong>{saias.length ? saias.join(", ") : "Nenhuma"}</strong>
          </button>
          <button className="revisao__linha" onClick={() => onEditar("pedra")}>
            <span>Pedra</span>
            <strong>{mat?.nome ?? "Não selecionada"}</strong>
          </button>
        </div>

        <footer className="revisao__total">
          <span>Total</span>
          {orc.completo ? (
            <strong>{rotuloTotal(orc)}</strong>
          ) : (
            <strong className="revisao__falta">Falta escolher a pedra</strong>
          )}
        </footer>

        <div className="revisao__acoes">
          <button className="btn-ghost" onClick={onFechar}>
            Editar configuração
          </button>
          {orc.completo ? (
            <Link className="btn-primario" to="/proposta" onClick={onFechar}>
              Gerar orçamento
            </Link>
          ) : (
            <button className="btn-primario" onClick={() => onEditar("pedra")}>
              Escolher a pedra
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
