/**
 * Página de entrada (especificação, seção 2): lista de projetos, busca por
 * nome do cliente, botão de novo projeto. Tudo vem do banco local.
 *
 * Estrutura: barra da marca (logotipo + Configurações + tema) → capa em
 * "pedra" com o título, o resumo e a ação principal → busca → projetos
 * (tabela no desktop, cartões no celular/tablet).
 *
 * Backup (.json) de tudo NÃO fica aqui — é manutenção/segurança, não parte
 * do fluxo diário de venda. Mora em /precos ("Configurações"); aqui só o
 * export de um projeto, no menu da linha.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InstalarBanner } from "@/components/InstalarBanner";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { materialPorId } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import type { Material, Projeto } from "@/domain/project";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { brl } from "@/domain/units";
import { exportarProjetos } from "@/lib/backup";
import { useProjectStore } from "@/store/projectStore";

/* ---------------------------------------------------------------- ícones */

function IconeMais() {
  return (
    <svg className="icone" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function IconeBusca() {
  return (
    <svg className="icone" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.75" cy="8.75" r="5.25" />
      <path d="m12.6 12.6 4 4" />
    </svg>
  );
}

function IconeAjustes() {
  return (
    <svg className="icone" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 6h7M14 6h3M3 14h3M10 14h7" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="8" cy="14" r="2" />
    </svg>
  );
}

function IconeMaisAcoes() {
  return (
    <svg className="icone icone--cheio" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="15.5" r="1.6" />
    </svg>
  );
}

/* ------------------------------------------------------------- auxiliares */

/**
 * Amostra da pedra do projeto: a foto da chapa por cima e, por baixo, a
 * textura desenhada do catálogo — se a foto não carregar (offline, primeira
 * vez), a de baixo aparece no lugar.
 */
function Amostra({ material }: { material: Material | null }) {
  if (!material) return <span className="amostra amostra--vazia" aria-hidden="true" />;
  const swatch = materialPorId(material.id)?.swatch;
  const camadas = [`url("${material.texturaUrl}")`, swatch && `url("${swatch}")`]
    .filter(Boolean)
    .join(", ");
  return <span className="amostra" style={{ backgroundImage: camadas }} aria-hidden="true" />;
}

/** "Mármores Nero Marquina" → { nome: "Nero Marquina", familia: "Mármore" } */
function nomePedra(material: Material | null): { nome: string; familia: string } {
  if (!material) return { nome: "Pedra não escolhida", familia: "" };
  const cat = materialPorId(material.id);
  if (!cat) return { nome: material.nome, familia: "" };
  const prefixo = `${cat.familia}s `;
  const nome = cat.nome.startsWith(prefixo) ? cat.nome.slice(prefixo.length) : cat.nome;
  return { nome, familia: cat.familia };
}

function dataCurta(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(d, hoje)) {
    return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (mesmoDia(d, ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

const nomeDoProjeto = (p: Projeto) => p.nome || "Projeto sem identificação";

/* ----------------------------------------------------------------- página */

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

  // orçamentos calculados uma vez só — reaproveitados no resumo da capa e
  // na tabela/lista, em vez de recalcular por linha em dois lugares
  const orcamentos = useMemo(
    () => new Map(lista.map((p) => [p.id, calcularOrcamento(p, tabela)])),
    [lista, tabela],
  );
  const valorTotal = useMemo(
    () => lista.reduce((soma, p) => soma + (orcamentos.get(p.id)?.total ?? 0), 0),
    [lista, orcamentos],
  );

  const exportar = (p: Projeto) => {
    setMenuAberto(null);
    void exportarProjetos([p]).then(recarregarLista);
  };

  const excluir = (p: Projeto) => {
    setMenuAberto(null);
    if (
      confirm(
        `Excluir "${nomeDoProjeto(p)}"?\n\nA exclusão é definitiva e apaga também os dados do cliente deste projeto.`,
      )
    ) {
      void excluirProjeto(p.id);
    }
  };

  /** botão ⋮ + menu da linha — o mesmo na tabela e nos cartões */
  const menuDaLinha = (p: Projeto) => (
    <div className="inicio-linha__menu">
      <button
        className="inicio-linha__acao"
        title="Mais ações"
        aria-label={`Mais ações para ${nomeDoProjeto(p)}`}
        aria-expanded={menuAberto === p.id}
        onClick={(e) => {
          e.stopPropagation();
          setMenuAberto((v) => (v === p.id ? null : p.id));
        }}
      >
        <IconeMaisAcoes />
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
          <div className="menu inicio-linha__menu-lista" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => exportar(p)}>Exportar (.json)</button>
            <button className="menu__perigo" onClick={() => excluir(p)}>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );

  const semCopia = (p: Projeto) =>
    !p.exportadoEm && (
      <em className="tag-sem-copia" title="Nunca exportado nem sincronizado">
        sem cópia
      </em>
    );

  const n = lista.length;
  const buscando = busca.trim().length > 0;

  return (
    <div className="inicio">
      <header className="inicio-topo">
        <div className="inicio-topo__conteudo">
          <Logo variante="compacto" className="inicio-topo__logo" />
          <nav className="inicio-topo__acoes" aria-label="Atalhos">
            <Link to="/precos" className="inicio-topo__link" aria-label="Configurações">
              <IconeAjustes />
              <span>Configurações</span>
            </Link>
            <TemaToggle compacta />
          </nav>
        </div>
      </header>

      <main className="inicio-corpo">
        <InstalarBanner />

        {/* a capa é uma chapa de pedra — fundo escuro com veios, nos dois temas */}
        <section className="inicio-capa" aria-labelledby="inicio-titulo">
          <div className="inicio-capa__texto">
            <h1 id="inicio-titulo">Projetos</h1>
            <p>
              {n === 0 ? (
                "Nenhum projeto ainda. Comece medindo a primeira bancada com o cliente."
              ) : (
                <>
                  {n} {n === 1 ? "projeto soma" : "projetos somam"}{" "}
                  <strong>{brl(valorTotal)}</strong> em orçamentos.
                </>
              )}
            </p>
          </div>
          <button className="inicio-capa__novo" onClick={iniciarNovoProjeto}>
            <IconeMais />
            Novo projeto
          </button>
        </section>

        {n > 0 && (
          <div className="inicio-barra">
            <label className="inicio-busca">
              <IconeBusca />
              <input
                type="search"
                placeholder="Buscar por cliente ou projeto"
                aria-label="Buscar por cliente ou projeto"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>
            <p className="inicio-barra__info" aria-live="polite">
              {buscando
                ? `${filtrada.length} de ${n} ${n === 1 ? "projeto" : "projetos"}`
                : "Mais recentes primeiro"}
            </p>
          </div>
        )}

        {n === 0 && (
          <div className="inicio-vazio">
            <strong>Os projetos aparecem aqui</strong>
            <p>
              Cada projeto guarda o cliente, as medidas, a pedra escolhida e o orçamento —
              tudo salvo neste aparelho, mesmo sem internet.
            </p>
          </div>
        )}

        {n > 0 && filtrada.length === 0 && (
          <div className="inicio-vazio">
            <strong>Nenhum projeto encontrado para “{busca.trim()}”</strong>
            <p>Confira a grafia ou busque pelo nome do cliente.</p>
            <button className="btn-ghost" onClick={() => setBusca("")}>
              Limpar busca
            </button>
          </div>
        )}

        {/* tabela — só no desktop (ver @media em styles.css); no tablet e no
            celular os cartões abaixo são a versão real, a tabela só fica
            escondida por CSS */}
        {filtrada.length > 0 && (
          <table className="inicio-tabela">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Pedra</th>
                <th>Ambiente</th>
                <th>Atualizado</th>
                <th className="num">Valor</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((p) => {
                const orc = orcamentos.get(p.id)!;
                const pedra = nomePedra(p.material);
                return (
                  <tr key={p.id} className="inicio-tabela__linha" onClick={() => abrir(p.id)}>
                    <td>
                      <button
                        className="inicio-tabela__abrir"
                        onClick={(e) => {
                          e.stopPropagation();
                          void abrir(p.id);
                        }}
                      >
                        {nomeDoProjeto(p)}
                      </button>
                      <span>{p.cliente.nome || "Cliente não informado"}</span>
                    </td>
                    <td>
                      <div className="inicio-pedra">
                        <Amostra material={p.material} />
                        <div>
                          <strong>{pedra.nome}</strong>
                          {pedra.familia && <span>{pedra.familia}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {AMBIENTE_LABEL[p.ambiente]}
                      <span>{FORMATO_LABEL[p.bancada.formato]}</span>
                    </td>
                    <td>
                      {dataCurta(p.atualizadoEm)}
                      {semCopia(p)}
                    </td>
                    <td className="num">
                      {orc.completo ? (
                        <>
                          <strong>{brl(orc.total)}</strong>
                          {orc.fretePendente && <span>+ frete</span>}
                        </>
                      ) : (
                        <strong title="Orçamento incompleto: falta escolher a pedra">—</strong>
                      )}
                    </td>
                    <td className="inicio-tabela__menu-cel">{menuDaLinha(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filtrada.length > 0 && (
          <ul className="inicio-cartoes">
            {filtrada.map((p) => {
              const orc = orcamentos.get(p.id)!;
              return (
                <li key={p.id} className="inicio-cartao">
                  <button className="inicio-cartao__abrir" onClick={() => abrir(p.id)}>
                    <Amostra material={p.material} />
                    <strong className="inicio-cartao__nome">{nomeDoProjeto(p)}</strong>
                    <span className="inicio-cartao__meta">
                      {[
                        p.cliente.nome || "Cliente não informado",
                        AMBIENTE_LABEL[p.ambiente],
                        dataCurta(p.atualizadoEm),
                      ].join(" · ")}
                    </span>
                    <span className="inicio-cartao__valor">
                      {orc.completo ? (
                        rotuloTotal(orc)
                      ) : (
                        <span className="inicio-cartao__pendente">Pedra não escolhida</span>
                      )}
                      {semCopia(p)}
                    </span>
                  </button>
                  {menuDaLinha(p)}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
