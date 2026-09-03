/**
 * Configurador — visualização em tela cheia, painéis flutuantes por cima,
 * faixa de ambientes no topo, barra de medidas, CTA embaixo.
 * Layout inspirado no simuladormarmoraria.com.br.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { materialPorId } from "@/domain/catalogo";
import { calcularOrcamento } from "@/domain/quote";
import { brl } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";
import { AmbienteStrip } from "./AmbienteStrip";
import { DimensionBar } from "./DimensionBar";
import { Drawing2D } from "./Drawing2D";
import { PainelComponentes, PainelPedras } from "./paineis";
import { PainelOrcamento } from "./PainelOrcamento";
import { PositionRuler } from "./PositionRuler";

const Scene3D = lazy(() =>
  import("./Scene3D").then((m) => ({ default: m.Scene3D })),
);

export function Configurador() {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const modo = useProjectStore((s) => s.modo);
  const toggleModo = useProjectStore((s) => s.toggleModo);
  const apresentacao = useProjectStore((s) => s.apresentacao);
  const setApresentacao = useProjectStore((s) => s.setApresentacao);
  const setNome = useProjectStore((s) => s.setNome);
  const novoProjeto = useProjectStore((s) => s.novoProjeto);

  const [menu, setMenu] = useState(false);
  const [preco, setPreco] = useState(false);
  const mat = materialPorId(projeto.material?.id ?? undefined);
  const cor = mat?.params.base ?? "#dedede";
  const total = useMemo(
    () => calcularOrcamento(projeto, tabela).total,
    [projeto, tabela],
  );
  const nomeMaterial = mat?.nome ?? "Selecione a pedra";

  return (
    <>
      <div className="rotacione">
        <div className="rotacione__ico">📱</div>
        <strong>Gire o dispositivo</strong>
        <span>
          O projeto da bancada é elaborado com a tela na horizontal. Vire o
          aparelho para o lado para continuar.
        </span>
      </div>
      <div className={`simu ${apresentacao ? "simu--apresentacao" : ""}`}>
      {!apresentacao && (
        <header className="simu__header">
          <Link to="/" className="simu__voltar" title="Meus projetos">‹</Link>
          <input
            className="simu__nome"
            placeholder="Identificação do projeto — ex: Julia · Pia cozinha"
            value={projeto.nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <span className="simu__sync">Salvo</span>
          <div className="simu__menu-wrap">
            <button className="btn-ico" onClick={() => setMenu((v) => !v)}>⋮</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { setApresentacao(true); setMenu(false); }}>
                  Modo apresentação
                </button>
                <Link to="/proposta" onClick={() => setMenu(false)}>Proposta comercial</Link>
                <Link to="/ordem-servico" onClick={() => setMenu(false)}>Ordem de serviço</Link>
                <hr />
                <Link to="/" onClick={() => setMenu(false)}>Meus projetos</Link>
                <button onClick={() => { void novoProjeto("pia"); setMenu(false); }}>
                  Novo projeto
                </button>
                <Link to="/precos" onClick={() => setMenu(false)}>Configurações</Link>
              </div>
            )}
          </div>
        </header>
      )}

      {!apresentacao && <AmbienteStrip />}
      {!apresentacao && <DimensionBar />}

      <div className="simu__palco">
        {modo === "3d" && (
          <div className="simu__badge">
            <span>VISUALIZAÇÃO 3D</span>
            <strong>{nomeMaterial}</strong>
          </div>
        )}

        {modo === "3d" ? (
          <Suspense fallback={<div className="simu__loading">Carregando 3D…</div>}>
            <Scene3D
              projeto={projeto}
              params={mat?.params ?? null}
              materialId={mat?.id ?? null}
              apresentacao={apresentacao}
            />
          </Suspense>
        ) : (
          <Drawing2D projeto={projeto} cor={cor} className="simu__svg" />
        )}

        {modo === "3d" && <div className="simu__hint">arraste para girar</div>}

        {!apresentacao && (
          <>
            <aside className="simu__left">
              <PainelComponentes />
            </aside>
            <aside className="simu__right">
              <PainelPedras />
            </aside>
            <PositionRuler />
          </>
        )}
      </div>

      <footer className="simu__cta">
        {apresentacao ? (
          <button className="btn-primario" onClick={() => setApresentacao(false)}>
            Sair da apresentação
          </button>
        ) : (
          <>
            <div className="simu__preco-wrap">
              <button className="simu__preco" onClick={() => setPreco((v) => !v)}>
                <span>Preço estimado</span>
                <strong>{brl(total)}</strong>
              </button>
              {preco && (
                <div className="simu__preco-pop" onMouseLeave={() => setPreco(false)}>
                  <PainelOrcamento />
                </div>
              )}
            </div>
            <button className="btn-toggle" onClick={toggleModo}>
              {modo === "2d" ? "Ver em 3D" : "Ver em 2D"}
            </button>
            <Link className="btn-primario" to="/proposta">
              Gerar orçamento
            </Link>
          </>
        )}
      </footer>
      </div>
    </>
  );
}
