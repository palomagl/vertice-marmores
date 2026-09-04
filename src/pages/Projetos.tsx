/**
 * Tela inicial (especificação, seção 2): lista de projetos, busca por nome do
 * cliente, botão de novo projeto. Tudo vem do banco local.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InstalarBanner } from "@/components/InstalarBanner";
import { AMBIENTE_LABEL, FORMATO_LABEL } from "@/domain/presets";
import { calcularOrcamento, rotuloTotal } from "@/domain/quote";
import {
  exportarProjetos,
  exportarTodos,
  importarBackup,
} from "@/lib/backup";
import { useProjectStore } from "@/store/projectStore";

export function Projetos() {
  const lista = useProjectStore((s) => s.lista);
  const tabela = useProjectStore((s) => s.tabela);
  const iniciarNovoProjeto = useProjectStore((s) => s.iniciarNovoProjeto);
  const abrirProjeto = useProjectStore((s) => s.abrirProjeto);
  const excluirProjeto = useProjectStore((s) => s.excluirProjeto);
  const recarregarLista = useProjectStore((s) => s.recarregarLista);
  const tema = useProjectStore((s) => s.tema);
  const alternarTema = useProjectStore((s) => s.alternarTema);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (p) =>
        p.cliente.nome.toLowerCase().includes(q) ||
        p.nome.toLowerCase().includes(q),
    );
  }, [lista, busca]);

  const naoExportados = lista.filter((p) => !p.exportadoEm).length;

  const abrir = async (id: string) => {
    await abrirProjeto(id);
    navigate("/editor");
  };

  const exportarTudo = async () => {
    const n = await exportarTodos();
    await recarregarLista();
    setAviso(n ? `${n} projeto(s) exportado(s).` : "Nada para exportar.");
  };

  const importar = async (arquivo: File) => {
    try {
      const res = await importarBackup(await arquivo.text());
      await recarregarLista();
      const partes = [
        res.novos && `${res.novos} novo(s)`,
        res.atualizados && `${res.atualizados} atualizado(s)`,
        res.ignorados.length && `${res.ignorados.length} ignorado(s)`,
      ].filter(Boolean);
      setAviso(`Importação: ${partes.join(", ") || "nada a importar"}.`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Falha ao importar.");
    }
  };

  return (
    <div className="tela">
      <InstalarBanner />

      <header className="tela__topo">
        <div>
          <h1>Projetos</h1>
          <p className="tela__sub">DF Mármores e Granitos</p>
        </div>
        <div className="tela__acoes">
          <button
            className="btn-ico"
            onClick={alternarTema}
            title={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          >
            {tema === "escuro" ? "☀" : "☾"}
          </button>
          <button className="btn-primario" onClick={iniciarNovoProjeto}>
            Novo projeto
          </button>
        </div>
      </header>

      <div className="tela__backup">
        <input
          ref={inputArquivo}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importar(f);
            e.target.value = "";
          }}
        />
        <button className="btn-ghost" onClick={() => inputArquivo.current?.click()}>
          Importar backup
        </button>
        <button className="btn-ghost" onClick={() => void exportarTudo()}>
          Exportar tudo{naoExportados > 0 ? ` (${naoExportados} sem cópia)` : ""}
        </button>
        {aviso && (
          <span className="tela__backup-aviso" onClick={() => setAviso(null)}>
            {aviso}
          </span>
        )}
      </div>

      <input
        className="tela__busca"
        placeholder="Buscar por cliente ou identificação do projeto"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

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
              <button
                className="linha-projeto__acao"
                title="Exportar este projeto (.json)"
                onClick={() => void exportarProjetos([p]).then(recarregarLista)}
              >
                ⬇
              </button>
              <button
                className="linha-projeto__excluir"
                title="Excluir definitivamente"
                onClick={() => {
                  if (
                    confirm(
                      `Excluir "${p.nome || "Projeto sem identificação"}"?\n\nA exclusão é definitiva e apaga também os dados do cliente deste projeto.`,
                    )
                  ) {
                    void excluirProjeto(p.id);
                  }
                }}
              >
                ✕
              </button>
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
