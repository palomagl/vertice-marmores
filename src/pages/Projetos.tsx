/**
 * Tela inicial (especificação, seção 2): lista de projetos, busca por nome do
 * cliente, botão de novo projeto. Tudo vem do banco local.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento } from "@/domain/quote";
import { brl } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

export function Projetos() {
  const lista = useProjectStore((s) => s.lista);
  const tabela = useProjectStore((s) => s.tabela);
  const novoProjeto = useProjectStore((s) => s.novoProjeto);
  const abrirProjeto = useProjectStore((s) => s.abrirProjeto);
  const excluirProjeto = useProjectStore((s) => s.excluirProjeto);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (p) =>
        p.cliente.nome.toLowerCase().includes(q) ||
        p.nome.toLowerCase().includes(q),
    );
  }, [lista, busca]);

  const abrir = async (id: string) => {
    await abrirProjeto(id);
    navigate("/editor");
  };
  const criar = async () => {
    await novoProjeto("pia");
    navigate("/editor");
  };

  return (
    <div className="tela">
      <header className="tela__topo">
        <h1>DF Mármores — Projetos</h1>
        <button className="btn-primario" onClick={criar}>
          + Novo projeto
        </button>
      </header>

      <input
        className="tela__busca"
        placeholder="Buscar por cliente ou projeto"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <ul className="lista-projetos">
        {filtrada.map((p) => {
          const total = p.material ? calcularOrcamento(p, tabela).total : null;
          return (
            <li key={p.id} className="linha-projeto">
              <button className="linha-projeto__abrir" onClick={() => abrir(p.id)}>
                <div className="linha-projeto__nome">
                  <strong>{p.nome || "Sem título"}</strong>
                  <span>{p.cliente.nome || "sem cliente"}</span>
                </div>
                <div className="linha-projeto__meta">
                  <span>
                    {AMBIENTE_LABEL[p.ambiente]} · {FORMATO_LABEL[p.bancada.formato]}
                  </span>
                  <span>
                    {new Date(p.atualizadoEm).toLocaleDateString("pt-BR")} ·{" "}
                    <em className={p.sync === "local" ? "tag-local" : "tag-sync"}>
                      {p.sync === "local" ? "local" : "sincronizado"}
                    </em>
                  </span>
                </div>
                <div className="linha-projeto__total">
                  {total != null ? brl(total) : "—"}
                </div>
              </button>
              <button
                className="linha-projeto__excluir"
                title="Excluir"
                onClick={() => {
                  if (confirm(`Excluir "${p.nome || "Sem título"}"?`)) {
                    void excluirProjeto(p.id);
                  }
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
        {filtrada.length === 0 && (
          <li className="lista-projetos__vazio">
            {lista.length === 0
              ? "Nenhum projeto ainda. Crie o primeiro."
              : "Nada encontrado para essa busca."}
          </li>
        )}
      </ul>
    </div>
  );
}
