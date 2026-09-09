/**
 * Botão de tema claro/escuro — switch neumórfico com os dois modos
 * escritos por extenso (pedido explícito da Paloma, com referência visual).
 * `compacta` é usada onde o espaço é apertado (cabeçalho do configurador,
 * inclusive celular) — mesmo mecanismo, só sem o texto ao lado.
 */
import { useProjectStore } from "@/store/projectStore";

export function TemaToggle({ compacta = false }: { compacta?: boolean }) {
  const tema = useProjectStore((s) => s.tema);
  const alternarTema = useProjectStore((s) => s.alternarTema);
  const escuro = tema === "escuro";

  return (
    <button
      className={`tema-toggle ${compacta ? "tema-toggle--compacta" : ""} ${escuro ? "is-escuro" : ""}`}
      onClick={alternarTema}
      aria-pressed={escuro}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Usar tema claro" : "Usar tema escuro"}
    >
      {!compacta && <span className="tema-toggle__rotulo">Modo claro</span>}
      <span className="tema-toggle__trilho">
        <span className="tema-toggle__bolinha" />
      </span>
      {!compacta && <span className="tema-toggle__rotulo">Modo escuro</span>}
    </button>
  );
}
