import { describe, expect, it } from "vitest";
import { recorteCabeNoTrecho } from "./geometry";
import {
  AMBIENTE_LABEL,
  DEFAULTS,
  montarAmbiente,
  PRESETS,
  realocarRecortesOrfaos,
  trechosAoTrocarFormato,
  trechosPadrao,
} from "./presets";
import type { Ambiente, Recorte } from "./project";

// ---------------------------------------------------------------------------

describe("trechosPadrao — P não nasce igual ao L", () => {
  it("P tem o mesmo braço A do L, mas o braço B (retorno) é bem mais curto", () => {
    const l = trechosPadrao("L", 600);
    const p = trechosPadrao("P", 600);
    expect(p[0].comprimento).toBe(l[0].comprimento); // mesmo braço principal
    expect(p[1].comprimento).toBe(DEFAULTS.retornoPeninsulaP);
    expect(p[1].comprimento).toBeLessThan(l[1].comprimento); // "retorno curto"
  });

  it("L e U continuam com os defaults de sempre (não regrediu)", () => {
    expect(trechosPadrao("L", 600)).toEqual([
      { comprimento: 2200, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ]);
    expect(trechosPadrao("U", 600)).toEqual([
      { comprimento: 1800, profundidade: 600 },
      { comprimento: 2400, profundidade: 600 },
      { comprimento: 1800, profundidade: 600 },
    ]);
  });
});

describe("trechosAoTrocarFormato — crescer usa os defaults reais do formato", () => {
  it("Linear → U usa 1800/2400/1800, não repete o comprimento atual 3x", () => {
    const atuais = trechosAoTrocarFormato(
      [{ comprimento: 3000, profundidade: 600 }],
      "U",
      600,
    );
    expect(atuais).toEqual([
      { comprimento: 3000, profundidade: 600 }, // preserva o que já existia
      { comprimento: 2400, profundidade: 600 }, // novo trecho = default REAL do U
      { comprimento: 1800, profundidade: 600 },
    ]);
  });

  it("U → Linear trunca, preservando o primeiro trecho", () => {
    const atuais = trechosAoTrocarFormato(
      [
        { comprimento: 1800, profundidade: 600 },
        { comprimento: 2400, profundidade: 600 },
        { comprimento: 1800, profundidade: 600 },
      ],
      "linear",
      600,
    );
    expect(atuais).toEqual([{ comprimento: 1800, profundidade: 600 }]);
  });

  it("L → P preserva os trechos existentes (não força o retorno curto num L já customizado)", () => {
    const atuais = trechosAoTrocarFormato(
      [
        { comprimento: 2500, profundidade: 600 },
        { comprimento: 2000, profundidade: 600 },
      ],
      "P",
      600,
    );
    expect(atuais).toEqual([
      { comprimento: 2500, profundidade: 600 },
      { comprimento: 2000, profundidade: 600 },
    ]);
  });
});

describe("realocarRecortesOrfaos — recorte não fica fantasma ao trocar de formato", () => {
  const recorte = (trecho: number): Recorte => ({
    id: "r1",
    tipo: "cuba_embutir",
    largura: 560,
    profundidade: 340,
    posicao: { trecho, distanciaInicio: 900, centralizada: false },
  });

  it("recorte no trecho C (2) some quando o formato encolhe pra 1 trecho — migra pro 0 e centraliza", () => {
    const [r] = realocarRecortesOrfaos([recorte(2)], 1);
    expect(r.posicao.trecho).toBe(0);
    expect(r.posicao.centralizada).toBe(true);
  });

  it("recorte que já está num trecho válido não é tocado", () => {
    const original = recorte(1);
    const [r] = realocarRecortesOrfaos([original], 2);
    expect(r).toEqual(original);
  });
});

describe("4 ambientes novos — churrasqueira, nicho, tanque, aparador", () => {
  const NOVOS: Ambiente[] = ["churrasqueira", "nicho", "tanque", "aparador"];

  it("todos têm rótulo e preset definidos", () => {
    for (const a of NOVOS) {
      expect(AMBIENTE_LABEL[a]).toBeTruthy();
      expect(PRESETS[a]).toBeTruthy();
    }
  });

  it("nicho e aparador usam comprimentoPadrao (não os 2000mm default de um linear qualquer) — medidas reais levantadas", () => {
    const nicho = montarAmbiente("nicho", 20, 900);
    const aparador = montarAmbiente("aparador", 20, 900);
    expect(nicho.trechos[0].comprimento).toBe(740); // caixa 80×35×12cm → base interna ~74cm
    expect(aparador.trechos[0].comprimento).toBe(1100); // medida equilibrada sugerida 110×40×80cm
    expect(nicho.trechos[0].comprimento).not.toBe(2000);
  });

  it("aparador usa alturaInstalacaoPadrao (80cm, não os 90cm padrão de bancada de cozinha) e espessuraPadrao (3cm)", () => {
    const aparador = montarAmbiente("aparador", 20, 900); // 20/900 = valores correntes do projeto, devem ser sobrescritos
    expect(aparador.alturaInstalacao).toBe(800);
    expect(aparador.espessura).toBe(30);
    // a saia até o piso usa altura E espessura RESOLVIDAS (800/30), não as recebidas (900/20)
    const saia = aparador.complementos.find((c) => c.tipo === "saia");
    expect(saia?.altura).toBe(800 - 30);
  });

  it("tanque usa espessuraPadrao (18cm — bloco monolítico, bem mais grosso que bancada comum)", () => {
    const tanque = montarAmbiente("tanque", 20, 900);
    expect(tanque.espessura).toBe(180);
  });

  it("ambientes sem espessuraPadrao continuam usando a espessura corrente do projeto (comportamento de sempre)", () => {
    const pia = montarAmbiente("pia", 30, 900); // vendedor já tinha escolhido 3cm antes de trocar de ambiente
    expect(pia.espessura).toBe(30);
  });

  it("ambientes sem alturaInstalacaoPadrao continuam usando a altura corrente do projeto (comportamento de sempre)", () => {
    const ilha = montarAmbiente("ilha", 20, 950); // vendedor mudou a altura antes de trocar de ambiente
    expect(ilha.alturaInstalacao).toBe(950);
  });

  it("churrasqueira e tanque nascem com o recorte de área molhada cabendo no trecho", () => {
    const churrasqueira = montarAmbiente("churrasqueira", 20, 900);
    const bancadaChurrasqueira = {
      formato: churrasqueira.formato,
      trechos: churrasqueira.trechos,
      espessura: 20,
      alturaInstalacao: 900,
    };
    for (const r of churrasqueira.recortes) {
      expect(recorteCabeNoTrecho(bancadaChurrasqueira, r)).toBe(true);
    }

    const tanque = montarAmbiente("tanque", 20, 900);
    const bancadaTanque = {
      formato: tanque.formato,
      trechos: tanque.trechos,
      espessura: 20,
      alturaInstalacao: 900,
    };
    for (const r of tanque.recortes) {
      expect(recorteCabeNoTrecho(bancadaTanque, r)).toBe(true);
    }
  });

  it("churrasqueira: vão central (recorte) tem uma borda de moldura consistente em volta (painel 90×65, vão 82×57)", () => {
    const { trechos, recortes } = montarAmbiente("churrasqueira", 20, 900);
    const [r] = recortes;
    const bordaLateral = (trechos[0].comprimento - r.largura) / 2;
    const bordaVertical = (trechos[0].profundidade - r.profundidade) / 2;
    expect(bordaLateral).toBe(40); // 4cm de cada lado
    expect(bordaVertical).toBe(40);
  });

  it("nicho e aparador nascem sem recorte (não são pontos de água)", () => {
    expect(montarAmbiente("nicho", 20, 900).recortes).toHaveLength(0);
    expect(montarAmbiente("aparador", 20, 900).recortes).toHaveLength(0);
  });

  it("nicho nasce com fundo + 2 laterais (3 paredes, na altura interna real) — não é mais uma tábua reta", () => {
    const { complementos } = montarAmbiente("nicho", 20, 900);
    const frontoes = complementos.filter((c) => c.tipo === "frontao");
    expect(frontoes.map((c) => c.lado).sort()).toEqual(["direito", "esquerdo", "traseiro"]);
    for (const f of frontoes) expect(f.altura).toBe(290); // altura interna do nicho, não o frontão padrão de 10cm
  });

  it("aparador nasce com saia até o piso nos 2 lados (é uma peça de apoio, tipo mini-ilha)", () => {
    const { complementos } = montarAmbiente("aparador", 20, 900);
    const saias = complementos.filter((c) => c.tipo === "saia");
    expect(saias.map((c) => c.lado).sort()).toEqual(["direito", "esquerdo"]);
    for (const s of saias) expect(s.altura).toBeGreaterThan(300); // desce até perto do piso, não é uma saibrinha padrão
  });

  it("os 4 são de formato fixo — não fazem sentido em L/P/U", () => {
    for (const a of NOVOS) expect(PRESETS[a].formatoFixo).toBe(true);
  });

  it("nenhuma bancada tradicional (pia, gourmet, banheiro, ilha, balcão, lavanderia) é de formato fixo", () => {
    const bancadas: Ambiente[] = ["pia", "gourmet", "banheiro", "ilha", "balcao", "lavanderia"];
    for (const a of bancadas) expect(PRESETS[a].formatoFixo).toBeFalsy();
  });
});
