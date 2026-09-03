# DF Mármores — Projeto e Orçamento

Web app do **vendedor** da marmoraria: monta o projeto da bancada junto com o
cliente, mostra em 2D e 3D, e fecha o orçamento na hora.

Baseado em [`especificacao-app-marmoraria.md`](./especificacao-app-marmoraria.md).
Referência de UX: `simuladormarmoraria.com.br` (mesma nomenclatura e navegação).

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção
npm run preview
```

Backend é opcional no começo — sem `.env.local` o app roda 100% local
(que é o cenário da casa do cliente, seção 11). Para ligar o Supabase:

```bash
cp .env.example .env.local   # e preencher as chaves
```

## Como está organizado

O coração é **um modelo de dados só** (`src/domain/project.ts`). 2D, 3D, orçamento
e proposta são todos *views* dele. **Toda medida é milímetro inteiro**; a conversão
para cm mora só em `src/domain/units.ts` e nos campos de entrada.

| Pasta | Papel |
|---|---|
| `src/domain/project.ts` | o objeto `Projeto` — a fonte única |
| `src/domain/units.ts` | única conversão mm ↔ cm ↔ m² ↔ R$ |
| `src/domain/presets.ts` | defaults e presets por ambiente (Pia, Gourmet, Banheiro, Ilha, Balcão) |
| `src/domain/geometry.ts` | JSON → contorno, bbox, segmentos de parede, posição dos recortes |
| `src/domain/quote.ts` | orçamento por **retângulo envolvente** (seção 9) |
| `src/domain/tabelaPrecos.ts` | tabela de preços default (vai para o admin depois) |
| `src/domain/catalogo.ts` | materiais e cubas de exemplo (trocar pelo estoque real) |
| `src/store/projectStore.ts` | estado (Zustand + persist local) |
| `src/components/Drawing2D.tsx` | **SVG puro** com cotas — imprime vetorial na proposta |
| `src/components/Scene3D.tsx` | `ExtrudeGeometry` do mesmo contorno, recortes como `holes` |
| `src/components/paineis.tsx` | as 4 abas: Pedras · Componentes · Medidas · Ambientes |
| `src/pages/Proposta.tsx` | proposta comercial, impressão via `@media print` |
| `supabase/schema.sql` | esquema inicial (uma empresa, sem multi-tenant) |

## O que já funciona

- 4 abas com a navegação da referência
- Presets de ambiente carregando profundidade / altura / complementos
- Formatos Linear · Em L · Em P · Em U com medidas por trecho
- Desenho 2D ao vivo com cotas em cm e hachura nas bordas de parede
- 3D ao vivo (extrusão + furos dos recortes) com toggle 2D/3D
- Componentes: área molhada (3 cantos), cuba, cooktop, furo de torneira
- Grid de pedras + acabamento de borda
- Orçamento ao vivo (retângulo envolvente, borda acabada, recortes, complementos, instalação)
- Modo apresentação (esconde custo e margem)
- Proposta comercial imprimível / PDF

## Próximos passos (ordem da seção 14)

1. Cuba esculpida e recortes com posição cotada a partir da borda
2. Complementos como geometria no 3D (frontão, saia)
3. Tela de admin da tabela de preços
4. Ordem de serviço para a oficina (mesmo JSON, sem valores)
5. AR com `<model-viewer>` + `GLTFExporter` / `USDZExporter`
6. Offline real: Dexie + fila de sincronização + lista de projetos
7. Calibração de tela (cartão ISO) e botão 1:1
8. Envio no WhatsApp

## Fora do caminho crítico — pedir para a DF agora

- Fotos das chapas do estoque (ver `public/chapas/LEIA-ME.txt`)
- Tabela de preços real (m², acabamentos, recortes, instalação, frete)
- Tamanho das chapas dos fornecedores
- Logo e dados para a proposta (CNPJ, contato)
