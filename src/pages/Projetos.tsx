/**
 * Tela inicial (especificação, seção 2): lista de projetos, busca por nome do
 * cliente, botão de novo projeto. Tudo vem do banco local.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { useProjectStore } from "@/store/projectStore";

export function Projetos() {
  const lista = useProjectStore((s) => s.lista);
  const tabela = useProjectStore((s) => s.tabela);
  const iniciarNovoProjeto = useProjectStore((s) => s.iniciarNovoProjeto);
  const abrirProjeto = useProjectStore((s) => s.abrirProjeto);
  const excluirProjeto = useProjectStore((s) => s.excluirProjeto);
  const tema = useProjectStore((s) => s.tema);
  const alternarTema = useProjectStore((s) => s.alternarTema);
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

  return (
    <div className="tela">
      <header className="tela__topo">
        <div>
          <h1>Projetos</h1>
          <p className="tela__sub">DF Mármores e Granitos</p>
        </div>
        <div className="tela__acoes">
          <button
            className="btn-ico"
            onClick={alternarTema}
            title={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          >
            {tema === "escuro" ? "☀" : "☾"}
          </button>
          <button className="btn-primario" onClick={iniciarNovoProjeto}>
            Novo projeto
          </button>
        </div>
      </header>

      <input
        className="tela__busca"
        placeholder="Buscar por cliente ou identificação do projeto"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <ul className="lista-projetos">
        {filtrada.map((p) => {
          const orc = calcularOrcamento(p, tabela);
          return (
            <li key={p.id} className="linha-projeto">
              <button className="linha-projeto__abrir" onClick={() => abrir(p.id)}>
                <div className="linha-projeto__nome">
                  <strong>{p.nome || "Projeto sem identificação"}</strong>
                  <span>{p.cliente.nome || "Cliente não informado"}</span>
                </div>
                <div className="linha-projeto__meta">
                  <span>
                    {AMBIENTE_LABEL[p.ambiente]} · {FORMATO_LABEL[p.bancada.formato]}
                  </span>
                  <span>
                    Atualizado em {new Date(p.atualizadoEm).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="linha-projeto__total">
                  {orc.completo ? rotuloTotal(orc) : "—"}
                </div>
              </button>
              <button
                className="linha-projeto__excluir"
                title="Excluir"
                onClick={() => {
                  if (confirm(`Excluir "${p.nome || "Projeto sem identificação"}"?`)) {
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
              ? "Nenhum projeto cadastrado. Clique em Novo projeto para começar."
              : "Nenhum projeto encontrado para essa busca."}
          </li>
        )}
      </ul>
    </div>
  );
}
