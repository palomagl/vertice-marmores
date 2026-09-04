/**
 * Configurador — 3D em tela cheia, controles flutuando por cima.
 *  - Tablet / desktop (paisagem): painéis laterais flutuantes sempre visíveis,
 *    faixa de ambientes e barra de medidas no topo.
 *  - Celular / tablet retrato: 3D sangra por trás dos controles; barra INFERIOR
 *    de 4 abas abre um bottom sheet arrastável (~55% da tela).
 * Layout inspirado no simuladormarmoraria.com.br.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { materialPorId } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { useProjectStore, type Aba, type ModoVisualizacao } from "@/store/projectStore";
import { AmbienteStrip } from "./AmbienteStrip";
import { Segmented } from "./campos";
import { DimensionBar } from "./DimensionBar";
import { Drawing2D } from "./Drawing2D";
import { PainelComponentes, PainelPedras } from "./paineis";
import { PainelOrcamento } from "./PainelOrcamento";
import { PositionRuler } from "./PositionRuler";

const Scene3D = lazy(() =>
  import("./Scene3D").then((m) => ({ default: m.Scene3D })),
);

/** abas da barra inferior (celular) */
const ABAS: { id: Aba; label: string; ico: string }[] = [
  { id: "ambientes", label: "Ambientes", ico: "⌂" },
  { id: "pedras", label: "Pedras", ico: "◈" },
  { id: "componentes", label: "Componentes", ico: "▤" },
  { id: "medidas", label: "Medidas", ico: "↔" },
];

const TITULO_SHEET: Record<Aba, string> = {
  ambientes: "Ambientes",
  pedras: "Escolha a pedra",
  componentes: "Componentes",
  medidas: "Medidas",
};

const MODOS: { value: ModoVisualizacao; label: string }[] = [
  { value: "3d", label: "3D" },
  { value: "2d", label: "2D" },
];

export function Configurador() {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const modo = useProjectStore((s) => s.modo);
  const setModo = useProjectStore((s) => s.setModo);
  const apresentacao = useProjectStore((s) => s.apresentacao);
  const setApresentacao = useProjectStore((s) => s.setApresentacao);
  const tema = useProjectStore((s) => s.tema);
  const alternarTema = useProjectStore((s) => s.alternarTema);
  const setNome = useProjectStore((s) => s.setNome);
  const iniciarNovoProjeto = useProjectStore((s) => s.iniciarNovoProjeto);
  const desfazer = useProjectStore((s) => s.desfazer);
  const refazer = useProjectStore((s) => s.refazer);
  const podeDesfazer = useProjectStore((s) => s.historico.length > 0);
  const podeRefazer = useProjectStore((s) => s.futuro.length > 0);

  const [menu, setMenu] = useState(false);
  const [preco, setPreco] = useState(false);
  /** aba aberta como bottom sheet no celular (null = fechada) */
  const [sheet, setSheet] = useState<Aba | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<number | null>(null);

  const mat = materialPorId(projeto.material?.id ?? undefined);
  const cor = mat?.params.base ?? "#dedede";
  const orc = useMemo(
    () => calcularOrcamento(projeto, tabela),
    [projeto, tabela],
  );
  const nomeMaterial = mat?.nome ?? "Selecione a pedra";

  // Ctrl/Cmd+Z desfaz, Ctrl+Shift+Z / Ctrl+Y refaz
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if (k === "y") {
        e.preventDefault();
        refazer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desfazer, refazer]);

  useEffect(() => setDragY(0), [sheet]);

  const enviarProposta = () => {
    // wa.me: o telefone no caminho é o DESTINATÁRIO (como o "To:" de um e-mail).
    // O texto NÃO leva nome/telefone/endereço do cliente — a mensagem vai para
    // ele mesmo e o resumo é só do produto (LGPD: minimização em URL).
    const tel = projeto.cliente.telefone.replace(/\D/g, "");
    const destino = tel ? (tel.length <= 11 ? `55${tel}` : tel) : "";
    const t = projeto.bancada.trechos;
    const medidas = t.map((x) => `${Math.round(x.comprimento / 10)} cm`).join(" + ");
    const texto = [
      `Proposta ${projeto.numero ?? ""} — ${tabela.empresa.nome}`.trim(),
      `Ambiente: ${AMBIENTE_LABEL[projeto.ambiente]} (${FORMATO_LABEL[projeto.bancada.formato]})`,
      `Medidas: ${medidas} · prof. ${Math.round(t[0].profundidade / 10)} cm`,
      `Pedra: ${nomeMaterial}`,
      orc.completo ? `Total: ${rotuloTotal(orc)}` : "",
      "",
      tabela.empresa.nome,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragRef.current == null) return;
    setDragY(Math.max(0, e.clientY - dragRef.current));
  };
  const onDragEnd = () => {
    if (dragRef.current == null) return;
    dragRef.current = null;
    setDragY((y) => {
      if (y > 90) setSheet(null);
      return 0;
    });
  };

  return (
    <div className={`simu ${apresentacao ? "simu--apresentacao" : ""}`}>
      {!apresentacao && (
        <header className="simu__header">
          <Link to="/" className="simu__voltar" title="Meus projetos">‹</Link>
          <input
            className="simu__nome"
            placeholder="Identificação do projeto"
            value={projeto.nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <div className="simu__modo">
            <Segmented value={modo} options={MODOS} onChange={setModo} />
          </div>
          <button
            className="btn-ico simu__undo"
            onClick={desfazer}
            disabled={!podeDesfazer}
            title="Desfazer (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            className="btn-ico simu__undo"
            onClick={refazer}
            disabled={!podeRefazer}
            title="Refazer (Ctrl+Shift+Z)"
          >
            ↷
          </button>
          <button
            className="btn-ico"
            onClick={alternarTema}
            title={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          >
            {tema === "escuro" ? "☀" : "☾"}
          </button>
          <div className="simu__menu-wrap">
            <button className="btn-ico" onClick={() => setMenu((v) => !v)}>⋮</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { setApresentacao(true); setMenu(false); }}>
                  Modo apresentação
                </button>
                <Link to="/proposta" onClick={() => setMenu(false)}>Proposta comercial</Link>
                <Link to="/ordem-servico" onClick={() => setMenu(false)}>Ordem de serviço</Link>
                <button
                  onClick={() => { enviarProposta(); setMenu(false); }}
                  disabled={!projeto.numero}
                  title={projeto.numero ? "" : "Gere o orçamento primeiro"}
                >
                  Enviar proposta ao cliente
                </button>
                <hr />
                <Link to="/" onClick={() => setMenu(false)}>Meus projetos</Link>
                <button onClick={() => { iniciarNovoProjeto(); setMenu(false); }}>
                  Novo projeto
                </button>
                <Link to="/precos" onClick={() => setMenu(false)}>Configurações</Link>
              </div>
            )}
          </div>
        </header>
      )}

      {/* topo — só tablet/desktop (no celular vira aba da barra inferior) */}
      {!apresentacao && <AmbienteStrip />}
      {!apresentacao && <DimensionBar />}

      <div className="simu__palco">
        {modo === "3d" && (
          <button
            className="simu__pedra"
            onClick={() => setSheet("pedras")}
            title="Trocar a pedra"
          >
            {nomeMaterial}
          </button>
        )}

        {modo === "3d" ? (
          <Suspense fallback={<div className="simu__loading">Carregando 3D…</div>}>
            <Scene3D
              projeto={projeto}
              params={mat?.params ?? null}
              materialId={mat?.id ?? null}
              apresentacao={apresentacao}
              tema={tema}
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

      <div className="simu__bottom">
        <footer className="simu__cta">
          {apresentacao ? (
            <button className="btn-primario" onClick={() => setApresentacao(false)}>
              Sair da apresentação
            </button>
          ) : (
            <>
              <div className="simu__preco-wrap">
                <button className="simu__preco" onClick={() => setPreco((v) => !v)}>
                  <span>Total</span>
                  {orc.completo ? (
                    <strong>{rotuloTotal(orc)}</strong>
                  ) : (
                    <strong className="simu__preco-vazio">
                      Selecione a pedra para ver o valor
                    </strong>
                  )}
                </button>
                {preco && (
                  <div className="simu__preco-pop" onMouseLeave={() => setPreco(false)}>
                    <PainelOrcamento />
                  </div>
                )}
              </div>
              {orc.completo ? (
                <Link className="btn-primario" to="/proposta">
                  Gerar orçamento
                </Link>
              ) : (
                <button
                  className="btn-primario"
                  disabled
                  title="Selecione a pedra para gerar o orçamento"
                >
                  Gerar orçamento
                </button>
              )}
            </>
          )}
        </footer>

        {!apresentacao && (
          <nav className="simu__tabs">
            {ABAS.map((a) => (
              <button
                key={a.id}
                className={sheet === a.id ? "is-active" : ""}
                onClick={() => setSheet((s) => (s === a.id ? null : a.id))}
              >
                <span className="simu__tabs-ico">{a.ico}</span>
                {a.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* bottom sheet — só aparece no celular (CSS) */}
      {sheet && !apresentacao && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
          >
            <div
              className="sheet__handle"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              <div className="sheet__grab" />
              <div className="sheet__head">
                <strong>{TITULO_SHEET[sheet]}</strong>
                <button onClick={() => setSheet(null)} aria-label="Fechar">✕</button>
              </div>
            </div>
            <div className="sheet__body">
              {sheet === "ambientes" && (
                <AmbienteStrip onPick={() => setSheet(null)} />
              )}
              {sheet === "pedras" && <PainelPedras />}
              {sheet === "componentes" && <PainelComponentes />}
              {sheet === "medidas" && (
                <>
                  <DimensionBar />
                  <div className="sheet__regua">
                    <PositionRuler />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
