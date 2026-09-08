/**
 * Configurador — DOIS modos, uma arquitetura só por baixo.
 *
 * MODO GUIADO (projeto recém-criado, `recemCriado` na store): a experiência
 * de ensinar a montar a primeira peça. EtapaRail no topo (progresso ✓/●/○),
 * painel abre sozinho na etapa atual com "← Voltar"/"Continuar →".
 *
 * MODO EDIÇÃO (projeto já existente, ou depois que o vendedor termina o
 * tour guiado uma vez — ver `finalizarCriacao`): a sensação do configurador
 * original. Nada abre sozinho; EdicaoBar no topo é só uma caixa de
 * ferramentas (sem progresso); o painel de cada assunto abre sob demanda e
 * fecha sem "próximo passo" nenhum. "Revisar orçamento" fica disponível
 * como ação, não como conclusão de fluxo.
 *
 * Os DOIS modos reaproveitam o mesmo painel único ("bottom sheet", mesmo
 * mecanismo em qualquer tamanho de tela) e os mesmos componentes de
 * conteúdo (AmbienteStrip, FormatoPicker, PainelPeca/Recortes/Acabamentos/
 * Pedras, Revisao) — só a moldura ao redor (topo + rodapé do painel) muda.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { materialPorId } from "@/domain/catalogo";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { useProjectStore, type ModoVisualizacao } from "@/store/projectStore";
import { AmbienteStrip } from "./AmbienteStrip";
import { Segmented } from "./campos";
import { DimensionBar } from "./DimensionBar";
import { Drawing2D } from "./Drawing2D";
import { EdicaoBar } from "./EdicaoBar";
import { ETAPAS, EtapaRail, etapaConcluida, type EtapaId } from "./EtapaRail";
import { FormatoPicker } from "./FormatoPicker";
import { OnboardingModal } from "./OnboardingModal";
import { PainelAcabamentos, PainelPeca, PainelPedras, PainelRecortes } from "./paineis";
import { PainelOrcamento } from "./PainelOrcamento";
import { PositionRuler } from "./PositionRuler";
import { Revisao } from "./Revisao";

const Scene3D = lazy(() =>
  import("./Scene3D").then((m) => ({ default: m.Scene3D })),
);

const MODOS: { value: ModoVisualizacao; label: string }[] = [
  { value: "3d", label: "3D" },
  { value: "2d", label: "2D" },
];

/** última etapa de conteúdo antes da Revisão (a etapa "revisao" não tem painel próprio — abre o modal) */
const ULTIMA_ETAPA_CONTEUDO = ETAPAS[ETAPAS.length - 2].id;

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
  const recemCriado = useProjectStore((s) => s.recemCriado);
  const finalizarCriacao = useProjectStore((s) => s.finalizarCriacao);
  const iniciarNovoProjeto = useProjectStore((s) => s.iniciarNovoProjeto);
  const desfazer = useProjectStore((s) => s.desfazer);
  const refazer = useProjectStore((s) => s.refazer);
  const podeDesfazer = useProjectStore((s) => s.historico.length > 0);
  const podeRefazer = useProjectStore((s) => s.futuro.length > 0);

  const [menu, setMenu] = useState(false);
  const [preco, setPreco] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState<EtapaId>("ambiente");
  /** painel da etapa aberto (mostrando a pergunta) ou recolhido (só o 3D) */
  const [painelAberto, setPainelAberto] = useState(true);
  const [revisao, setRevisao] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef<number | null>(null);

  const mat = materialPorId(projeto.material?.id ?? undefined);
  const cor = mat?.params.base ?? "#dedede";
  const orc = useMemo(
    () => calcularOrcamento(projeto, tabela),
    [projeto, tabela],
  );
  const nomeMaterial = mat?.nome ?? "Selecione a pedra";

  const idxAtual = ETAPAS.findIndex((e) => e.id === etapaAtual);
  const etapaInfo = ETAPAS[idxAtual];
  const ultimaEtapa = etapaAtual === ULTIMA_ETAPA_CONTEUDO;

  /**
   * "recemCriado" É a fonte de verdade dos dois modos (não inventei uma
   * segunda flag): true = tour guiado; false = edição rápida — seja porque
   * o projeto já existia (abrirProjeto sempre zera a flag) ou porque o
   * vendedor terminou o tour uma vez nesta sessão (finalizarCriacao).
   */
  const modoUI: "guiado" | "edicao" = recemCriado ? "guiado" : "edicao";

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

  useEffect(() => setDragY(0), [etapaAtual, painelAberto]);

  /*
   * Ao entrar num projeto (ou trocar de projeto sem sair da rota /editor —
   * "Novo projeto" no menu ⋮ enquanto já está no editor navega pra /editor
   * de novo, e o React Router NÃO remonta o componente só porque a rota é a
   * mesma; por isso o efeito depende de `projeto.id`, não roda só uma vez):
   *
   *   MODO GUIADO (recemCriado): abre o painel já na etapa "Ambiente" — o
   *   tour começa do zero.
   *
   *   MODO EDIÇÃO (projeto já existia): NÃO abre nada sozinho. A tela
   *   mostra a bancada; o vendedor escolhe o que quer editar pela
   *   EdicaoBar. Nenhum modal/painel aparece por conta própria — é
   *   deliberado, é a diferença central entre "tutorial" e "ferramenta".
   *
   * Depende só de `projeto.id` — NÃO de `recemCriado`. `recemCriado`
   * também muda quando o vendedor termina o tour guiado (finalizarCriacao,
   * dentro do MESMO projeto); se esse efeito reagisse a isso, ele rodaria
   * de novo bem na hora de abrir a Revisão e fecharia ela sozinho
   * (`setRevisao(false)` correndo atrás do `setRevisao(true)` de
   * `abrirRevisao`). O valor de `recemCriado` já é lido fresco de dentro
   * do efeito — só não precisa ser gatilho pra rodar de novo.
   */
  useEffect(() => {
    setRevisao(false);
    if (recemCriado) {
      setEtapaAtual("ambiente");
      setPainelAberto(true);
    } else {
      setEtapaAtual("ambiente");
      setPainelAberto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto.id]);

  /** abre a Revisão — no modo guiado, isso também "forma" o projeto pro modo edição */
  const abrirRevisao = () => {
    setPainelAberto(false);
    setRevisao(true);
    if (modoUI === "guiado") finalizarCriacao();
  };

  /** navega pra uma etapa (rail no guiado, EdicaoBar na edição, chip da pedra, linhas da Revisão) */
  const irPara = (id: EtapaId) => {
    if (id === "revisao") {
      abrirRevisao();
      return;
    }
    setEtapaAtual(id);
    setPainelAberto(true);
  };
  /** só existe sentido no modo guiado — avança pra próxima etapa da sequência */
  const avancar = () => {
    if (ultimaEtapa) {
      abrirRevisao();
      return;
    }
    const prox = ETAPAS[idxAtual + 1];
    if (prox) irPara(prox.id);
  };
  const voltar = () => {
    const ant = ETAPAS[idxAtual - 1];
    if (ant) irPara(ant.id);
  };

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
      if (y > 90) setPainelAberto(false);
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
              <>
                {/* fundo clicável — fecha no toque, sem depender de hover/mouseleave */}
                <button
                  className="click-backdrop"
                  aria-label="Fechar menu"
                  onClick={() => setMenu(false)}
                />
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
              </>
            )}
          </div>
        </header>
      )}

      {!apresentacao && modoUI === "guiado" && (
        <EtapaRail
          atual={etapaAtual}
          concluida={(id) => etapaConcluida(id, projeto)}
          onIr={irPara}
        />
      )}
      {!apresentacao && modoUI === "edicao" && (
        <EdicaoBar ativa={painelAberto ? etapaAtual : null} onAbrir={irPara} />
      )}

      <div className="simu__palco">
        {!apresentacao && modo === "3d" && (
          <button className="simu__pedra" onClick={() => irPara("pedra")} title="Trocar a pedra">
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

        {/* painel recolhido (arrastado pra baixo) — pastilha pra reabrir na etapa em que parou */}
        {!apresentacao && !painelAberto && (
          <button className="simu__reabrir" onClick={() => setPainelAberto(true)}>
            {etapaInfo.titulo} <span>↑</span>
          </button>
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
                  <>
                    <button
                      className="click-backdrop"
                      aria-label="Fechar"
                      onClick={() => setPreco(false)}
                    />
                    <div className="simu__preco-pop" onMouseLeave={() => setPreco(false)}>
                      <PainelOrcamento />
                    </div>
                  </>
                )}
              </div>
              <button
                className="btn-primario"
                onClick={modoUI === "guiado" ? avancar : abrirRevisao}
              >
                {modoUI === "guiado"
                  ? ultimaEtapa
                    ? "Revisar orçamento →"
                    : "Continuar →"
                  : "Revisar orçamento"}
              </button>
            </>
          )}
        </footer>
      </div>

      {/* painel único da etapa atual — mesmo mecanismo em qualquer tamanho de tela */}
      {!apresentacao && painelAberto && (
        <div className="sheet-backdrop" onClick={() => setPainelAberto(false)}>
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
                {/* modo guiado pergunta ("Qual é o formato...?"); edição só nomeia a ferramenta ("Formato") */}
                <strong>{modoUI === "guiado" ? etapaInfo.pergunta : etapaInfo.titulo}</strong>
                <button
                  onClick={() => setPainelAberto(false)}
                  // o header inteiro é área de arrastar — sem isso, o toque aqui
                  // vira início de arraste em vez de clique (ver Configurador antigo)
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Ver a peça inteira"
                  title="Recolher e ver a peça"
                >
                  ⌄
                </button>
              </div>
            </div>
            <div className="sheet__body">
              {etapaAtual === "ambiente" && <AmbienteStrip />}
              {etapaAtual === "formato" && <FormatoPicker />}
              {etapaAtual === "medidas" && (
                <>
                  <PainelPeca />
                  <DimensionBar />
                </>
              )}
              {etapaAtual === "recortes" && (
                <>
                  <PainelRecortes />
                  <PositionRuler />
                </>
              )}
              {etapaAtual === "acabamentos" && <PainelAcabamentos />}
              {etapaAtual === "pedra" && <PainelPedras />}
            </div>
            {/* rodapé Voltar/Continuar só existe no modo guiado — no modo edição
                não há "próximo passo": fecha pelo ⌄ ou tocando fora do painel */}
            {modoUI === "guiado" && (
              <div className="sheet__footer">
                <button className="btn-ghost" onClick={voltar} disabled={idxAtual === 0}>
                  ← Voltar
                </button>
                <button className="btn-primario" onClick={avancar}>
                  {ultimaEtapa ? "Revisar orçamento →" : "Continuar →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {revisao && !apresentacao && (
        <Revisao
          onFechar={() => setRevisao(false)}
          onEditar={(etapa) => {
            setRevisao(false);
            irPara(etapa);
          }}
        />
      )}

      {!apresentacao && <OnboardingModal />}
    </div>
  );
}
