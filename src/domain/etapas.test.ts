import { describe, expect, it } from "vitest";
import { etapaConcluida, ETAPAS, primeiraEtapaPendente } from "./etapas";
import { projetoNovo } from "./presets";
import type { Material, Recorte } from "./project";

// não importa de ./catalogo: MATERIAIS carrega stoneTexture.ts, que usa
// `document.createElement("canvas")` no load — incompatível com o ambiente
// "node" dos testes de domínio (mesmo motivo por trás dos outros arquivos
// de teste). Um material mínimo serve igual pra `etapaConcluida`, que só
// olha se `projeto.material` é não-nulo.
const PEDRA_TESTE: Material = {
  id: "teste",
  nome: "Pedra de teste",
  texturaUrl: "",
  precoM2: 100,
  chapa: { largura: 3000, altura: 1800 },
};

describe("etapaConcluida — reflete os DADOS, não navegação", () => {
  it("projeto recém-criado (com material padrão): tudo concluído, incluindo Revisão", () => {
    const p = projetoNovo("pia");
    p.material = PEDRA_TESTE; // é isso que o store faz em criarProjeto/hidratar
    for (const e of ETAPAS) {
      expect(etapaConcluida(e.id, p)).toBe(true);
    }
  });

  it("sem pedra selecionada: Pedra e Revisão ficam pendentes, o resto não", () => {
    const p = projetoNovo("balcao"); // balcão nasce sem recortes/frontão/saia
    p.material = null;
    expect(etapaConcluida("ambiente", p)).toBe(true);
    expect(etapaConcluida("formato", p)).toBe(true);
    expect(etapaConcluida("medidas", p)).toBe(true);
    expect(etapaConcluida("recortes", p)).toBe(true);
    expect(etapaConcluida("acabamentos", p)).toBe(true);
    expect(etapaConcluida("pedra", p)).toBe(false);
    expect(etapaConcluida("revisao", p)).toBe(false);
  });

  it("recorte maior que o trecho onde foi colocado: Recortes e Revisão ficam pendentes", () => {
    const p = projetoNovo("balcao");
    p.material = PEDRA_TESTE;
    const grandeDemais: Recorte = {
      id: "r1",
      tipo: "area_molhada",
      largura: 9999,
      profundidade: 300,
      posicao: { trecho: 0, distanciaInicio: 0, centralizada: false },
    };
    p.recortes = [grandeDemais];
    expect(etapaConcluida("recortes", p)).toBe(false);
    expect(etapaConcluida("revisao", p)).toBe(false);
    // as outras etapas não são afetadas por isso
    expect(etapaConcluida("pedra", p)).toBe(true);
  });

  it("trecho com medida zerada: Medidas e Revisão ficam pendentes", () => {
    const p = projetoNovo("balcao");
    p.material = PEDRA_TESTE;
    p.bancada.trechos[0].comprimento = 0;
    expect(etapaConcluida("medidas", p)).toBe(false);
    expect(etapaConcluida("revisao", p)).toBe(false);
  });
});

describe("primeiraEtapaPendente — por onde reabrir o editor", () => {
  it("tudo pronto → manda direto pra Revisão", () => {
    const p = projetoNovo("pia");
    p.material = PEDRA_TESTE;
    expect(primeiraEtapaPendente(p)).toBe("revisao");
  });

  it("sem pedra → manda pra Pedra (não pra Revisão, mesmo sendo a única pendência)", () => {
    const p = projetoNovo("balcao");
    p.material = null;
    expect(primeiraEtapaPendente(p)).toBe("pedra");
  });

  it("respeita a ORDEM do fluxo — pendência em Medidas vence pendência em Pedra", () => {
    const p = projetoNovo("balcao");
    p.material = null;
    p.bancada.trechos[0].comprimento = 0;
    expect(primeiraEtapaPendente(p)).toBe("medidas");
  });
});
