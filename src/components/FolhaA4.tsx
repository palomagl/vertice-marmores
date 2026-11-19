/**
 * Folha A4 compartilhada pela proposta e pela ordem de serviço.
 *
 * O documento é SEMPRE desenhado em 210mm reais. Na tela ele é encolhido
 * com transform: scale() até caber na largura disponível — então o que a
 * pessoa vê no celular é literalmente a folha que vai sair na impressora,
 * só menor. Antes a folha reflowava como página responsiva e o preview
 * mentia sobre o resultado impresso.
 *
 * transform não afeta layout, então a altura do wrapper é corrigida na
 * mão (scrollHeight * escala), senão sobraria um rio de espaço em branco
 * embaixo. Na impressão a escala volta a 1 e nada é transformado — quem
 * desfaz isso é o @media print no styles.css.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** 210mm a 96dpi. É a largura em que o documento é escrito. */
const LARGURA_A4_PX = 794;

interface Props {
  /** tarja de aviso no topo da folha (simulação). Sai na impressão também. */
  tarja?: string;
  children: ReactNode;
}

export function FolhaA4({ tarja, children }: Props) {
  const palco = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLElement>(null);
  const [escala, setEscala] = useState(1);
  const [altura, setAltura] = useState<number | null>(null);

  const medir = useCallback(() => {
    const caixa = palco.current;
    const papel = folha.current;
    if (!caixa || !papel) return;

    const disponivel = caixa.clientWidth;
    if (!disponivel) return;

    // nunca amplia: em tela larga a folha fica no tamanho real
    const nova = Math.min(1, disponivel / LARGURA_A4_PX);
    const novaAltura = Math.round(papel.scrollHeight * nova);

    setEscala((atual) => (Math.abs(atual - nova) < 0.001 ? atual : nova));
    setAltura((atual) => (atual === novaAltura ? atual : novaAltura));
  }, []);

  useEffect(() => {
    medir();
    const caixa = palco.current;
    const papel = folha.current;
    if (!caixa || !papel) return;

    // o palco reage à rotação do aparelho; a folha, ao conteúdo mudar.
    // mexer na altura do palco não muda a largura dele, então não há laço.
    const obs = new ResizeObserver(medir);
    obs.observe(caixa);
    obs.observe(papel);
    window.addEventListener("orientationchange", medir);
    return () => {
      obs.disconnect();
      window.removeEventListener("orientationchange", medir);
    };
  }, [medir]);

  const estilo = {
    "--folha-escala": escala,
    "--folha-altura": altura != null ? `${altura}px` : "auto",
  } as CSSProperties;

  return (
    <div className="folha-wrap">
      <div className="folha-barra app-ui">
        <Link to="/editor" className="btn-ghost folha-barra__voltar">
          ← Voltar
        </Link>
        <button className="btn-primario folha-barra__imprimir" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="folha-palco" ref={palco} style={estilo}>
        <article className="documento" ref={folha}>
          {tarja && <p className="doc__tarja">{tarja}</p>}
          {children}
        </article>
      </div>
    </div>
  );
}
