/**
 * Tela de admin da tabela de preços (especificação, seção 9).
 * Tudo editável pelo dono, sem mexer em código. Grava no banco local.
 */
import { Link } from "react-router-dom";
import type { TabelaPrecos } from "@/domain/tabelaPrecos";
import { useProjectStore } from "@/store/projectStore";

function NumRow({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="preco-row">
      <span>{label}</span>
      <span className="preco-row__in">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  );
}

function TxtRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="preco-row preco-row--txt">
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Precos() {
  const tabela = useProjectStore((s) => s.tabela);
  const setTabela = useProjectStore((s) => s.setTabela);

  const patchMapa = (
    chave: "acabamentoBorda" | "recorte" | "complemento",
    sub: string,
    v: number,
  ) =>
    setTabela({
      [chave]: { ...(tabela[chave] as Record<string, number>), [sub]: v },
    } as Partial<TabelaPrecos>);

  const setEmpresa = (patch: Partial<TabelaPrecos["empresa"]>) =>
    setTabela({ empresa: { ...tabela.empresa, ...patch } });

  return (
    <div className="tela">
      <header className="tela__topo">
        <div>
          <Link to="/editor" className="btn-ghost">← Voltar ao projeto</Link>
          <h1>Configurações</h1>
        </div>
        <span className="tela__nota">Salvo automaticamente</span>
      </header>

      <div className="preco-grid">
        <section className="preco-card preco-card--wide">
          <h2>Dados da empresa</h2>
          <p className="preco-card__nota">
            Aparecem na proposta comercial e na ordem de serviço.
          </p>
          <TxtRow
            label="Razão social"
            value={tabela.empresa.nome}
            onChange={(v) => setEmpresa({ nome: v })}
          />
          <TxtRow
            label="CNPJ"
            value={tabela.empresa.cnpj}
            onChange={(v) => setEmpresa({ cnpj: v })}
          />
          <TxtRow
            label="Telefone"
            value={tabela.empresa.telefone}
            onChange={(v) => setEmpresa({ telefone: v })}
          />
          <TxtRow
            label="Cidade / UF"
            value={tabela.empresa.cidade}
            onChange={(v) => setEmpresa({ cidade: v })}
          />
          <TxtRow
            label="Prazo de entrega"
            value={tabela.empresa.prazoEntrega}
            onChange={(v) => setEmpresa({ prazoEntrega: v })}
          />
          <TxtRow
            label="Forma de pagamento"
            value={tabela.empresa.formaPagamento}
            onChange={(v) => setEmpresa({ formaPagamento: v })}
          />
          <NumRow
            label="Validade da proposta"
            value={tabela.empresa.validadeDias}
            onChange={(n) => setEmpresa({ validadeDias: n })}
            suffix="dias"
          />
        </section>

        <section className="preco-card">
          <h2>Acabamento de borda (R$/m linear)</h2>
          {Object.entries(tabela.acabamentoBorda).map(([k, v]) => (
            <NumRow
              key={k}
              label={k.replace(/_/g, " ")}
              value={v}
              onChange={(n) => patchMapa("acabamentoBorda", k, n)}
            />
          ))}
        </section>

        <section className="preco-card">
          <h2>Recortes (R$ por peça)</h2>
          {Object.entries(tabela.recorte).map(([k, v]) => (
            <NumRow
              key={k}
              label={k.replace(/_/g, " ")}
              value={v}
              onChange={(n) => patchMapa("recorte", k, n)}
            />
          ))}
        </section>

        <section className="preco-card">
          <h2>Complementos (R$/m linear)</h2>
          {Object.entries(tabela.complemento).map(([k, v]) => (
            <NumRow
              key={k}
              label={k.replace(/_/g, " ")}
              value={v}
              onChange={(n) => patchMapa("complemento", k, n)}
            />
          ))}
        </section>

        <section className="preco-card">
          <h2>Instalação</h2>
          <NumRow
            label="Fixo por serviço"
            value={tabela.instalacao.fixo}
            onChange={(n) => setTabela({ instalacao: { ...tabela.instalacao, fixo: n } })}
            suffix="R$"
          />
          <NumRow
            label="Adicional por m²"
            value={tabela.instalacao.porM2}
            onChange={(n) => setTabela({ instalacao: { ...tabela.instalacao, porM2: n } })}
            suffix="R$/m²"
          />
        </section>

        <section className="preco-card">
          <h2>Frete por faixa</h2>
          {tabela.frete.map((f, i) => (
            <div key={i} className="preco-row">
              <span>
                até{" "}
                <input
                  type="number"
                  className="preco-mini"
                  value={f.ateKm}
                  onChange={(e) => {
                    const frete = tabela.frete.map((x, j) =>
                      j === i ? { ...x, ateKm: Number(e.target.value) } : x,
                    );
                    setTabela({ frete });
                  }}
                />{" "}
                km
              </span>
              <span className="preco-row__in">
                <input
                  type="number"
                  value={f.valor}
                  onChange={(e) => {
                    const frete = tabela.frete.map((x, j) =>
                      j === i ? { ...x, valor: Number(e.target.value) } : x,
                    );
                    setTabela({ frete });
                  }}
                />
                <em>R$</em>
              </span>
            </div>
          ))}
        </section>

        <section className="preco-card">
          <h2>Regras</h2>
          <NumRow
            label="Fator de aproveitamento da chapa"
            value={tabela.fatorAproveitamento}
            step={0.05}
            onChange={(n) => setTabela({ fatorAproveitamento: n })}
            suffix="×"
          />
          <NumRow
            label="Margem mínima"
            value={tabela.margemMinimaPct}
            onChange={(n) => setTabela({ margemMinimaPct: n })}
            suffix="%"
          />
          <NumRow
            label="Desconto máximo do vendedor"
            value={tabela.descontoMaximoPct}
            onChange={(n) => setTabela({ descontoMaximoPct: n })}
            suffix="%"
          />
        </section>
      </div>
    </div>
  );
}
