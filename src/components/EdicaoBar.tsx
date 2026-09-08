/**
 * Acesso rápido do MODO EDIÇÃO — substitui o EtapaRail quando o projeto já
 * existe. Mesma lista de destinos (domain/etapas.ts), sem "Revisão" (isso é
 * o botão "Revisar orçamento" do rodapé, não um painel) e sem ✓/●/○: não é
 * uma sequência a cumprir, é uma caixa de ferramentas — o vendedor abre o
 * que precisa mudar e pronto.
 */
import { ETAPAS, type EtapaId } from "@/domain/etapas";

const ITENS = ETAPAS.filter((e) => e.id !== "revisao");

export function EdicaoBar({
  ativa,
  onAbrir,
}: {
  /** qual painel está aberto agora, se algum */
  ativa: EtapaId | null;
  onAbrir: (id: EtapaId) => void;
}) {
  return (
    <nav className="edicao-bar" aria-label="Editar a bancada">
      {ITENS.map((e) => (
        <button
          key={e.id}
          className={`edicao-bar__item ${ativa === e.id ? "is-ativa" : ""}`}
          onClick={() => onAbrir(e.id)}
        >
          {e.titulo}
        </button>
      ))}
    </nav>
  );
}
