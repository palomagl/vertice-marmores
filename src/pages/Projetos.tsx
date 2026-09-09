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
import { brl } from "@/domain/units";
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

  // orçamentos calculados uma vez só — reaproveitados nos cards de resumo e
  // na tabela/lista, em vez de recalcular por linha em dois lugares
  const orcamentos = useMemo(
    () => new Map(lista.map((p) => [p.id, calcularOrcamento(p, tabela)])),
    [lista, tabela],
  );
  const valorTotal = useMemo(
    () => lista.reduce((soma, p) => soma + (orcamentos.get(p.id)?.total ?? 0), 0),
    [lista, orcamentos],
  );
  const atualizadoAte = useMemo(
    () =>
      lista.length === 0
        ? null
        : new Date(
            lista.reduce((max, p) => (p.atualizadoEm > max ? p.atualizadoEm : max), lista[0].atualizadoEm),
          ).toLocaleDateString("pt-BR"),
    [lista],
  );

  return (
    <div className="tela">
      <InstalarBanner />

      {/* identidade da empresa — separado do título da página (abaixo), que
          é sobre ESTA tela (Projetos), não sobre a marca */}
      <header className="app-header">
        <div className="app-header__marca">
          <div className="app-header__logo">DF</div>
          <div>
            <strong>DF Mármores e Granitos</strong>
            <span>Painel de projetos e orçamentos</span>
          </div>
        </div>
        <TemaToggle compacta />
      </header>

      <header className="tela__topo">
        <div>
          <h1>Projetos</h1>
          <p className="tela__sub">
            {lista.length > 0
              ? `${lista.length} projeto${lista.length > 1 ? "s" : ""} · atualizado até ${atualizadoAte}`
              : "Nenhum projeto ainda"}
          </p>
        </div>
      </header>

      {/* ação principal — sempre a coisa mais óbvia da tela — e a busca lado
          a lado no desktop, onde tem espaço de sobra (ver @media em styles.css) */}
      <div className="tela__acoes-principais">
        <input
          className="tela__busca"
          placeholder="Buscar por cliente ou identificação do projeto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="btn-primario tela__novo" onClick={iniciarNovoProjeto}>
          + Novo projeto
        </button>
      </div>

      {lista.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-card__rotulo">Projetos ativos</span>
            <strong className="stat-card__valor">{lista.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card__rotulo">Valor total em orçamentos</span>
            <strong className="stat-card__valor">{brl(valorTotal)}</strong>
          </div>
        </div>
      )}

      {/* tabela — só no desktop, onde tem coluna sobrando (ver @media em
          styles.css); no tablet/celular a lista de cards abaixo continua
          sendo a versão real, ela nunca some, só fica escondida por CSS */}
      <table className="tabela-projetos">
        <thead>
          <tr>
            <th>Projeto</th>
            <th>Ambiente · Formato</th>
            <th>Atualizado</th>
            <th>Valor</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {filtrada.map((p) => {
            const orc = orcamentos.get(p.id)!;
            return (
              <tr key={p.id} className="tabela-projetos__linha" onClick={() => abrir(p.id)}>
                <td>
                  <strong>{p.nome || "Projeto sem identificação"}</strong>
                  <span>{p.cliente.nome || "Cliente não informado"}</span>
                </td>
                <td>
                  {AMBIENTE_LABEL[p.ambiente]} · {FORMATO_LABEL[p.bancada.formato]}
                </td>
                <td>{new Date(p.atualizadoEm).toLocaleDateString("pt-BR")}</td>
                <td>
                  <strong>{orc.completo ? rotuloTotal(orc) : "—"}</strong>
                  {!p.exportadoEm && (
                    <em className="tag-sem-copia" title="Nunca exportado nem sincronizado">
                      sem cópia
                    </em>
                  )}
                </td>
                <td className="tabela-projetos__menu-cel">
                  <div className="linha-projeto__menu-wrap">
                    <button
                      className="linha-projeto__acao"
                      title="Mais ações"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAberto((v) => (v === p.id ? null : p.id));
                      }}
                    >
                      ⋮
                    </button>
                    {menuAberto === p.id && (
                      <>
                        <button
                          className="click-backdrop"
                          aria-label="Fechar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAberto(null);
                          }}
                        />
                        <div className="menu menu--projeto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuAberto(null);
                              void exportarProjetos([p]).then(recarregarLista);
                            }}
                          >
                            Exportar (.json)
                          </button>
                          <button
                            className="menu__perigo"
                            onClick={(e) => {
                              e.stopPropagation();
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtrada.length === 0 && (
        <p className="tabela-projetos__vazio">
          {lista.length === 0
            ? "Nenhum projeto cadastrado. Clique em Novo projeto para começar."
            : "Nenhum projeto encontrado para essa busca."}
        </p>
      )}

      <ul className="lista-projetos">
        {filtrada.map((p) => {
          const orc = orcamentos.get(p.id)!;
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
