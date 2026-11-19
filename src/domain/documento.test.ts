import { describe, expect, it } from "vitest";
import { ehSimulacao, linhaDeContato, podeNumerar, textoUtil } from "./documento";
import { projetoNovo } from "./presets";
import type { Projeto } from "./project";

function comCliente(nome: string, telefone = ""): Projeto {
  const p = projetoNovo("pia");
  return { ...p, cliente: { ...p.cliente, nome, telefone } };
}

describe("textoUtil — placeholder não vai para o papel", () => {
  it("devolve o texto quando ele diz alguma coisa", () => {
    expect(textoUtil("57.362.230/0001-18")).toBe("57.362.230/0001-18");
    expect(textoUtil("  Abelardo Luz, SC  ")).toBe("Abelardo Luz, SC");
  });

  it('descarta o "0" que estava imprimindo "CNPJ 0" na proposta', () => {
    expect(textoUtil("0")).toBeUndefined();
    expect(textoUtil("000")).toBeUndefined();
  });

  it("descarta placeholder zerado com pontuação de CNPJ e de telefone", () => {
    expect(textoUtil("00.000.000/0000-00")).toBeUndefined();
    expect(textoUtil("(00) 00000-0000")).toBeUndefined();
    expect(textoUtil("+00 00 0000")).toBeUndefined();
  });

  it("descarta vazio, espaço e traço solto", () => {
    expect(textoUtil("")).toBeUndefined();
    expect(textoUtil("   ")).toBeUndefined();
    expect(textoUtil(undefined)).toBeUndefined();
    expect(textoUtil(null)).toBeUndefined();
    expect(textoUtil("—")).toBeUndefined();
    expect(textoUtil("não informado")).toBeUndefined();
  });

  it("um zero DENTRO de um valor real não zera o campo", () => {
    expect(textoUtil("Sala 0")).toBe("Sala 0");
    expect(textoUtil("(49) 3000-0001")).toBe("(49) 3000-0001");
  });
});

describe("linhaDeContato", () => {
  it("junta só o que tem valor útil", () => {
    expect(linhaDeContato(["Vértice", undefined, "0", "SC"])).toBe("Vértice · SC");
  });

  it("sem nada útil não devolve linha nenhuma (nem separador solto)", () => {
    expect(linhaDeContato(["", "0", undefined])).toBeUndefined();
  });
});

describe("simulação", () => {
  it("projeto sem nome de cliente é simulação", () => {
    expect(ehSimulacao(comCliente(""))).toBe(true);
    expect(ehSimulacao(comCliente("   "))).toBe(true);
  });

  it("com cliente não é simulação", () => {
    expect(ehSimulacao(comCliente("Julia Almeida"))).toBe(false);
  });
});

describe("podeNumerar — simulação não queima número da empresa", () => {
  it("simulação NUNCA numera, mesmo com a pedra escolhida", () => {
    expect(podeNumerar(comCliente(""), true)).toBe(false);
  });

  it("sem pedra não numera, mesmo com cliente", () => {
    expect(podeNumerar(comCliente("Julia Almeida"), false)).toBe(false);
  });

  it("cliente + pedra: aí sim é proposta de verdade", () => {
    expect(podeNumerar(comCliente("Julia Almeida"), true)).toBe(true);
  });
});
