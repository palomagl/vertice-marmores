/**
 * Proposta comercial (especificação, seção 10).
 * Mesmo JSON do configurador, outra view. Impressão via @media print:
 * "Imprimir" funciona direto e o próprio diálogo salva em PDF.
 * O SVG do desenho entra inline e imprime vetorial.
 */
import { useEffect, useMemo } from "react";
import { FolhaA4 } from "@/components/FolhaA4";
import { Drawing2D } from "@/components/Drawing2D";
import { Logo } from "@/components/Logo";
import { MATERIAIS } from "@/domain/catalogo";
import { ehSimulacao, linhaDeContato, podeNumerar, textoUtil } from "@/domain/documento";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import { brl, mmParaCmLabel } from "@/domain/units";
import { useProjectStore } from "@/store/projectStore";

export function Proposta() {
  const projeto = useProjectStore((s) => s.projeto);
  const tabela = useProjectStore((s) => s.tabela);
  const garantirNumeroProposta = useProjectStore((s) => s.garantirNumeroProposta);
  const orc = useMemo(() => calcularOrcamento(projeto, tabela), [projeto, tabela]);
  const empresa = tabela.empresa;
  const simulacao = ehSimulacao(projeto);
  const numerar = podeNumerar(projeto, orc.completo);

  useEffect(() => {
    // Só proposta de verdade consome número: precisa de pedra (senão não há
    // produto) e de cliente (simulação queimando número fura a contagem da
    // empresa — cinco brincadeiras no balcão e já era o 0005).
    if (numerar) garantirNumeroProposta();
  }, [numerar, garantirNumeroProposta]);

  if (!orc.completo) {
    return (
      <FolhaA4>
        <h1>Proposta indisponível</h1>
        <p>Selecione a pedra no projeto para gerar a proposta comercial.</p>
      </FolhaA4>
    );
  }

  const hoje = new Date();
  const validade = new Date(hoje.getTime() + empresa.validadeDias * 864e5);
  const numero = projeto.numero;
  const material = MATERIAIS.find((m) => m.id === projeto.material?.id);
  const cnpj = textoUtil(empresa.cnpj);
  const contato = linhaDeContato([cnpj && `CNPJ ${cnpj}`, empresa.telefone, empresa.cidade]);
  const clienteNome = textoUtil(projeto.cliente?.nome);
  const clienteContato = linhaDeContato([projeto.cliente?.telefone, projeto.cliente?.endereco]);
  const prazoPagamento = linhaDeContato([
    textoUtil(empresa.prazoEntrega) && `Prazo de entrega: ${empresa.prazoEntrega}`,
    textoUtil(empresa.formaPagamento) && `Pagamento: ${empresa.formaPagamento}`,
  ]);

  return (
    <FolhaA4 tarja={simulacao ? "Simulação — sem validade comercial" : undefined}>
        {/* cabeçalho com o logotipo; o nome da empresa (editável em
            Configurações) continua por extenso na linha de contato e no rodapé */}
        <header className="doc__head doc__head--marca">
          <div>
            <Logo className="doc__logo" />
            <h1 className="doc__empresa">{empresa.nome}</h1>
            {contato && <p>{contato}</p>}
          </div>
          <div className="doc__num">
            <strong>{numero ? `Proposta nº ${numero}` : "Proposta"}</strong>
            <p>Data: {hoje.toLocaleDateString("pt-BR")}</p>
            <p>Validade: {validade.toLocaleDateString("pt-BR")}</p>
          </div>
        </header>

        <section className="doc__bloco nao-quebrar">
          {/* bloco de cliente só existe se houver cliente: antes imprimia
              um traço solto em toda simulação */}
          {clienteNome && (
            <>
              <h2>Cliente</h2>
              <p>{clienteNome}</p>
              {clienteContato && <p>{clienteContato}</p>}
            </>
          )}
          <p>Projeto: <strong>{projeto.nome || "Projeto sem identificação"}</strong></p>
        </section>

        <section className="doc__desenho nao-quebrar">
          <Drawing2D projeto={projeto} />
        </section>

        <section className="doc__bloco nao-quebrar">
          <h2>Especificação</h2>
          <table className="doc__spec">
            <tbody>
              <tr><th>Ambiente</th><td>{AMBIENTE_LABEL[projeto.ambiente]}</td></tr>
              <tr><th>Formato</th><td>{FORMATO_LABEL[projeto.bancada.formato]}</td></tr>
              <tr>
                <th>Medidas</th>
                <td>
                  {projeto.bancada.trechos
                    .map((t) => `${mmParaCmLabel(t.comprimento)}`)
                    .join(" + ")}{" "}
                  · prof. {mmParaCmLabel(projeto.bancada.trechos[0].profundidade)}
                </td>
              </tr>
              <tr><th>Espessura</th><td>{projeto.bancada.espessura / 10} cm</td></tr>
              <tr><th>Material</th><td>{material?.nome ?? "—"}</td></tr>
              <tr>
                <th>Acabamento</th>
                <td className="cap">{projeto.acabamentoBorda.tipo.replace("_", " ")}</td>
              </tr>
              {projeto.recortes.map((r) => (
                <tr key={r.id}>
                  <th>{r.tipo.replace(/_/g, " ")}</th>
                  <td>
                    {r.diametro
                      ? `Ø ${r.diametro} mm`
                      : `${mmParaCmLabel(r.largura)} × ${mmParaCmLabel(r.profundidade)}`}
                  </td>
                </tr>
              ))}
              {projeto.complementos.map((c) => (
                <tr key={c.id}>
                  <th>{c.tipo}</th>
                  <td>altura {mmParaCmLabel(c.altura)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="doc__bloco nao-quebrar">
          <h2>Valores</h2>
          <table className="doc__valores">
            <tbody>
              {orc.itens.map((i) => (
                <tr key={i.chave}>
                  <td>{i.descricao} <em>{i.detalhe}</em></td>
                  <td className="num">
                    {i.valor == null ? "a combinar" : brl(i.valor)}
                  </td>
                </tr>
              ))}
              <tr className="doc__total">
                <td>TOTAL</td>
                <td className="num">{rotuloTotal(orc)}</td>
              </tr>
            </tbody>
          </table>
          <p className="doc__obs">
            Valores sujeitos a confirmação de medição no local da instalação.
          </p>
        </section>

        <footer className="doc__rodape">
          {prazoPagamento && <p>{prazoPagamento}</p>}
          <p>{linhaDeContato([empresa.nome, cnpj && `CNPJ ${cnpj}`])}</p>
        </footer>
    </FolhaA4>
  );
}
