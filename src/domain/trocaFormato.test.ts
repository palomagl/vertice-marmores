/**
 * Troca de formato — as 12 combinações possíveis entre Linear/L/P/U, cada
 * uma com um recorte em CADA trecho de origem (A, B e C quando existir).
 * Reproduz exatamente o que `setFormato` (projectStore.ts) faz: primeiro
 * `trechosAoTrocarFormato`, depois `realocarRecortesOrfaos` — e verifica
 * que o resultado faz sentido pros três consumidores da geometria (SVG,
 * 3D e orçamento passam todos por `geometriaRecorte`/`contornoBancada`).
 */
import { describe, expect, it } from "vitest";
import { geometriaRecorte, recorteCabeNoTrecho } from "./geometry";
import {
  projetoNovo,
  realocarRecortesOrfaos,
  trechosAoTrocarFormato,
  trechosPadrao,
} from "./presets";
import type { Bancada, Formato, Projeto, Recorte } from "./project";

const FORMATOS: Formato[] = ["linear", "L", "P", "U"];
const PROF = 600;

const recorteEm = (trecho: number): Recorte => ({
  id: `r-trecho-${trecho}`,
  tipo: "cuba_embutir",
  largura: 500,
  profundidade: 300,
  posicao: { trecho, distanciaInicio: 200, centralizada: false },
});

describe("troca de formato — as 12 combinações, recortes em todos os trechos de origem", () => {
  for (const origem of FORMATOS) {
    for (const destino of FORMATOS) {
      if (origem === destino) continue;

      it(`${origem} → ${destino}`, () => {
        const trechosOrigem = trechosPadrao(origem, PROF);
        const recortesOrigem = trechosOrigem.map((_, i) => recorteEm(i));

        // mesma sequência que setFormato roda de verdade
        const trechosNovos = trechosAoTrocarFormato(trechosOrigem, destino, PROF);
        const recortesNovos = realocarRecortesOrfaos(recortesOrigem, trechosNovos.length);

        const bancadaNova: Bancada = {
          formato: destino,
          trechos: trechosNovos,
          espessura: 20,
          alturaInstalacao: 900,
        };
        const p: Projeto = { ...projetoNovo("balcao"), bancada: bancadaNova, recortes: recortesNovos };

        // 1. nº de trechos bate com o formato de destino
        expect(trechosNovos.length).toBe(trechosPadrao(destino, PROF).length);

        // 2. nenhum recorte aponta pra um trecho que deixou de existir
        for (const r of recortesNovos) {
          expect(r.posicao.trecho).toBeLessThan(trechosNovos.length);
          expect(r.posicao.trecho).toBeGreaterThanOrEqual(0);
        }

        // 3. cada recorte continua com geometria sã — sem NaN — e cabendo
        // fisicamente no trecho (as dimensões de teste, 500×300, cabem em
        // qualquer trecho-padrão do sistema; ver trocaFormato.test.ts)
        for (const r of recortesNovos) {
          const g = geometriaRecorte(p, r);
          for (const c of g.cantos) {
            expect(Number.isFinite(c.x)).toBe(true);
            expect(Number.isFinite(c.y)).toBe(true);
          }
          expect(recorteCabeNoTrecho(bancadaNova, r)).toBe(true);
        }

        // 4. recorte cujo trecho de origem sumiu foi realocado pro 0 e
        // centralizado — não ficou com um dado antigo incoerente guardado
        recortesOrigem.forEach((original, i) => {
          const ficouOrfao = original.posicao.trecho >= trechosNovos.length;
          const atual = recortesNovos[i];
          if (ficouOrfao) {
            expect(atual.posicao.trecho).toBe(0);
            expect(atual.posicao.centralizada).toBe(true);
          } else {
            // recorte que sobreviveu não foi mexido à toa
            expect(atual.posicao.trecho).toBe(original.posicao.trecho);
            expect(atual.posicao.distanciaInicio).toBe(original.posicao.distanciaInicio);
          }
        });
      });
    }
  }
});

describe("troca de formato ida-e-volta — Linear → U → Linear com recortes", () => {
  it("não acumula lixo nem duplica recortes ao ir e voltar", () => {
    const t0 = trechosPadrao("linear", PROF);
    const r0 = [recorteEm(0)];

    const t1 = trechosAoTrocarFormato(t0, "U", PROF);
    const r1 = realocarRecortesOrfaos(r0, t1.length);
    expect(t1).toHaveLength(3);
    expect(r1).toHaveLength(1);
    expect(r1[0].posicao.trecho).toBe(0); // sobreviveu, não foi órfão

    const t2 = trechosAoTrocarFormato(t1, "linear", PROF);
    const r2 = realocarRecortesOrfaos(r1, t2.length);
    expect(t2).toHaveLength(1);
    expect(r2).toHaveLength(1); // ainda 1 recorte — não duplicou nem sumiu
    expect(r2[0].posicao.trecho).toBe(0);
  });
});
