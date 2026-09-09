/**
 * Tela inicial (especificação, seção 2): lista de projetos, busca por nome do
 * cliente, botão de novo projeto. Tudo vem do banco local.
 *
 * Backup (.json) NÃO fica mais aqui — é manutenção/segurança, não parte do
 * fluxo diário de venda. Mora em /precos ("Configurações").
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InstalarBanner } from "@/components/InstalarBanner";
import { TemaToggle } from "@/components/TemaToggle";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { exportarProjetos } from "@/lib/backup";
import { useProjectStore } from "@/store/projectStore";

export function Projetos() {
  const lista = useProjectStore((s) => s.lista);
  const tabela = useProjectStore((s) => s.tabela);
  const iniciarNovoProjeto = useProjectStore((s) => s.iniciarNovoProjeto);
  const abrirProjeto = useProjectStore((s) => s.abrirProjeto);
  const excluirProjeto = useProjectStore((s) => s.excluirProjeto);
  const recarregarLista = useProjectStore((s) => s.recarregarLista);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

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
      <InstalarBanner />

      <header className="tela__topo">
        <div>
          <h1>Projetos</h1>
          <p className="tela__sub">
            DF Mármores e Granitos
            {lista.length > 0 && ` · ${lista.length} projeto${lista.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <TemaToggle />
      </header>

      {/* ação principal — sempre a coisa mais óbvia da tela — e a busca lado
          a lado no desktop, onde tem espaço de sobra (ver @media em styles.css) */}
      <div className="tela__acoes-principais">
        <button className="btn-primario tela__novo" onClick={iniciarNovoProjeto}>
          + Novo projeto
        </button>
        <input
          className="tela__busca"
          placeholder="Buscar por cliente ou identificação do projeto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

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
                  {!p.exportadoEm && (
                    <em className="tag-sem-copia" title="Nunca exportado nem sincronizado">
                      sem cópia
                    </em>
                  )}
                </div>
              </button>
              <div className="linha-projeto__menu-wrap">
                <button
                  className="linha-projeto__acao"
                  title="Mais ações"
                  onClick={() => setMenuAberto((v) => (v === p.id ? null : p.id))}
                >
                  ⋮
                </button>
                {menuAberto === p.id && (
                  <>
                    <button
                      className="click-backdrop"
                      aria-label="Fechar"
                      onClick={() => setMenuAberto(null)}
                    />
                    <div className="menu menu--projeto">
                      <button
                        onClick={() => {
                          setMenuAberto(null);
                          void exportarProjetos([p]).then(recarregarLista);
                        }}
                      >
                        Exportar (.json)
                      </button>
                      <button
                        className="menu__perigo"
                        onClick={() => {
                          setMenuAberto(null);
                          if (
                            confirm(
                              `Excluir "${p.nome || "Projeto sem identificação"}"?\n\nA exclusão é definitiva e apaga também os dados do cliente deste projeto.`,
                            )
                          ) {
                            void excluirProjeto(p.id);
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
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
