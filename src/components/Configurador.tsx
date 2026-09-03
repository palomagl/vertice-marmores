/**
 * Layout do configurador (especificação, seção 4.1):
 * visualização em tela cheia, painéis flutuantes por cima, CTA fixo embaixo.
 * Pensado para tablet na horizontal, que é como o vendedor usa.
 */
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { MATERIAIS } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { useProjectStore, type Aba } from "@/store/projectStore";
import { Drawing2D } from "./Drawing2D";

// Three.js só carrega quando o vendedor abre o 3D.
const Scene3D = lazy(() =>
  import("./Scene3D").then((m) => ({ default: m.Scene3D })),
);
import {
  PainelAmbientes,
  PainelComponentes,
  PainelMedidas,
  PainelPedras,
} from "./paineis";
import { PainelOrcamento } from "./PainelOrcamento";

const ABAS: { id: Aba; label: string }[] = [
  { id: "pedras", label: "Pedras" },
  { id: "componentes", label: "Componentes" },
  { id: "medidas", label: "Medidas" },
  { id: "ambientes", label: "Ambientes" },
];

function corDoMaterial(id: string | undefined): string {
  return MATERIAIS.find((m) => m.id === id)?.corFallback ?? "#d8d8d5";
}

export function Configurador() {
  const projeto = useProjectStore((s) => s.projeto);
  const aba = useProjectStore((s) => s.aba);
  const setAba = useProjectStore((s) => s.setAba);
  const modo = useProjectStore((s) => s.modo);
  const toggleModo = useProjectStore((s) => s.toggleModo);
  const apresentacao = useProjectStore((s) => s.apresentacao);
  const setApresentacao = useProjectStore((s) => s.setApresentacao);
  const setNome = useProjectStore((s) => s.setNome);
  const novoProjeto = useProjectStore((s) => s.novoProjeto);

  const [menuAberto, setMenuAberto] = useState(false);
  const cor = corDoMaterial(projeto.material?.id ?? undefined);

  return (
    <div className={`config ${apresentacao ? "config--apresentacao" : ""}`}>
      {/* área de visualização, tela cheia */}
      <div className="config__palco">
        {modo === "3d" ? (
          <Suspense fallback={<div className="palco-carregando">Carregando 3D…</div>}>
            <Scene3D projeto={projeto} cor={cor} apresentacao={apresentacao} />
          </Suspense>
        ) : (
          <Drawing2D projeto={projeto} cor={cor} className="config__svg" />
        )}
      </div>

      {/* barra superior */}
      {!apresentacao && (
        <header className="config__topo">
          <div className="config__proj">
            <input
              className="config__nome"
              placeholder="Nome do projeto — ex: Julia · Pia cozinha"
              value={projeto.nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <span className="config__tags">
              {AMBIENTE_LABEL[projeto.ambiente]} · {FORMATO_LABEL[projeto.bancada.formato]} ·{" "}
              <span className={projeto.sync === "local" ? "tag-local" : "tag-sync"}>
                {projeto.sync === "local" ? "salvo localmente" : "sincronizado"}
              </span>
            </span>
          </div>

          <div className="config__acoes-topo">
            <button className="btn-ghost" onClick={() => setMenuAberto((v) => !v)}>
              ⋮
            </button>
            {menuAberto && (
              <div className="menu" onMouseLeave={() => setMenuAberto(false)}>
                <button
                  onClick={() => {
                    setApresentacao(true);
                    setMenuAberto(false);
                  }}
                >
                  Apresentar ao cliente
                </button>
                <Link to="/proposta" onClick={() => setMenuAberto(false)}>
                  Gerar proposta (PDF)
                </Link>
                <Link to="/ordem-servico" onClick={() => setMenuAberto(false)}>
                  Ordem de serviço (oficina)
                </Link>
                <button disabled>Ver na vida real (AR) — em breve</button>
                <button disabled>Enviar no WhatsApp — em breve</button>
                <hr />
                <Link to="/" onClick={() => setMenuAberto(false)}>
                  Meus projetos
                </Link>
                <button
                  onClick={() => {
                    void novoProjeto("pia");
                    setMenuAberto(false);
                  }}
                >
                  Novo projeto
                </button>
                <Link to="/precos" onClick={() => setMenuAberto(false)}>
                  Tabela de preços
                </Link>
              </div>
            )}
          </div>
        </header>
      )}

      {/* abas laterais fixas */}
      {!apresentacao && (
        <nav className="config__abas">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={aba === a.id ? "is-active" : ""}
              onClick={() => setAba(a.id)}
            >
              {a.label}
            </button>
          ))}
        </nav>
      )}

      {/* painel do conteúdo da aba */}
      {!apresentacao && (
        <section className="config__painel">
          {aba === "ambientes" && <PainelAmbientes />}
          {aba === "medidas" && <PainelMedidas />}
          {aba === "componentes" && <PainelComponentes />}
          {aba === "pedras" && <PainelPedras />}
        </section>
      )}

      {/* orçamento ao vivo */}
      {!apresentacao && (
        <aside className="config__orcamento">
          <PainelOrcamento />
        </aside>
      )}

      {/* CTA fixo embaixo */}
      <footer className="config__cta">
        {apresentacao ? (
          <button className="btn-primario" onClick={() => setApresentacao(false)}>
            Sair da apresentação
          </button>
        ) : (
          <>
            <button className="btn-toggle" onClick={toggleModo}>
              {modo === "2d" ? "Ver em 3D" : "Ver em 2D"}
            </button>
            <button className="btn-primario" disabled title="Integração em breve">
              Enviar projeto
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
