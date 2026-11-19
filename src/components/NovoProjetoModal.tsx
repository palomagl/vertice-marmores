/**
 * Passo antes do configurador: nome do cliente (único obrigatório) + telefone.
 * O nome do projeto é derivado daqui e nunca fica vazio na lista.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/projectStore";

export function NovoProjetoModal() {
  const aberto = useProjectStore((s) => s.criandoProjeto);
  const base = useProjectStore((s) => s.duplicandoDe);
  const cancelar = useProjectStore((s) => s.cancelarNovoProjeto);
  const criarProjeto = useProjectStore((s) => s.criarProjeto);
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) {
      // duplicando: já vem com o cliente do original, para o caso comum de
      // outro cômodo da mesma casa. Vem selecionado para trocar digitando.
      setNome(base?.cliente.nome ?? "");
      setTelefone(base?.cliente.telefone ?? "");
      // foco automático no campo do cliente
      const t = setTimeout(() => {
        nomeRef.current?.focus();
        if (base?.cliente.nome) nomeRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [aberto, base]);

  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelar();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [aberto, cancelar]);

  if (!aberto) return null;

  const criar = async (comCliente: boolean) => {
    await criarProjeto({
      nome: comCliente ? nome : "",
      telefone: comCliente ? telefone : "",
    });
    navigate("/editor");
  };

  return (
    <div className="modal-backdrop" onClick={cancelar}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) void criar(true);
        }}
      >
        <h2>{base ? "Duplicar projeto" : "Novo projeto"}</h2>
        {base && (
          <p className="modal__nota">
            Copia a peça de <strong>{base.nome}</strong> — ambiente, formato,
            medidas, recortes, acabamento e pedra. A cópia nasce sem número de
            proposta.
          </p>
        )}

        <label className="modal__campo">
          <span>Nome do cliente</span>
          <input
            ref={nomeRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Julia Almeida"
            autoComplete="off"
          />
        </label>

        <label className="modal__campo">
          <span>Telefone <em>(opcional)</em></span>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="off"
          />
        </label>

        <button type="submit" className="btn-primario" disabled={!nome.trim()}>
          {base ? "Duplicar" : "Criar projeto"}
        </button>
        <button
          type="button"
          className="modal__sim"
          onClick={() => void criar(false)}
        >
          Sem cliente (simulação)
        </button>
      </form>
    </div>
  );
}
