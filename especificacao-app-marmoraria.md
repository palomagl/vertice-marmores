# App de Projeto e Orçamento para Marmoraria

Especificação técnica e de produto.

---

## 1. O que é

Web app responsivo (celular, tablet e PC) para o **vendedor da marmoraria** montar o projeto da bancada junto com o cliente, na hora, e sair com orçamento fechado.

Três coisas o app precisa fazer bem:

1. Desenhar a peça com medidas reais e cotas visíveis
2. Mostrar em 3D pro cliente entender o que vai receber
3. Calcular o preço final corretamente

Referência de mercado: **Rocha Certa** (R$ 10/mês). Ver seção 13 sobre posicionamento.

### Quem usa

O vendedor, não o cliente final. Isso libera decisões de interface:

- Pode ser densa e rápida — campo numérico direto, atalho de teclado no PC, sem tutorial
- Pode mostrar custo, margem e desconto máximo autorizado
- **Mas** existe um modo de apresentação que esconde tudo isso quando a tela vira pro cliente (seção 8)

---

## 2. Fluxo do usuário

```
Abrir app
  └─ Lista de projetos (busca por nome do cliente)
       └─ [+ Novo projeto]
            ├─ Nome do projeto  ("Julia — Pia cozinha")
            ├─ Dados do cliente (telefone p/ mandar o PDF depois)
            │
            ├─ ESCOLHER FORMATO
            │    Reto · L · U · Ilha · Personalizado
            │
            ├─ DIGITAR MEDIDAS
            │    Comprimento de cada trecho, profundidade, altura
            │    → desenho 2D atualiza em tempo real com as cotas
            │
            ├─ ADICIONAR PEÇAS
            │    Cuba (esculpida / embutir / sobrepor)
            │    Cooktop · Furo de torneira
            │    Frontão · Saia · Rodabanca
            │
            ├─ ESCOLHER MATERIAL
            │    Grid com fotos das chapas reais do estoque
            │
            ├─ ACABAMENTO DE BORDA
            │    Reto · Boleado · Meia-cana · Bisotê · Meia-esquadria
            │
            ├─ VER 3D  ⟷  VER 2D    (botão de alternância)
            │
            ├─ ORÇAMENTO
            │    Itens detalhados · total · margem (só vendedor)
            │
            └─ [⋮] MENU
                 ├─ Apresentar ao cliente   (fundo neutro, sem preço de custo)
                 ├─ Ver na vida real (AR)   (aponta a câmera)
                 ├─ Gerar PDF
                 └─ Enviar no WhatsApp
```

---

## 3. A decisão mais importante: um modelo de dados só

**Tudo lê da mesma fonte.** O desenho 2D, o 3D, o AR, o PDF e o cálculo do orçamento são views do mesmo objeto.

Se 2D e 3D forem estruturas separadas, viram dois apps que discordam entre si — e o vendedor descobre isso na frente do cliente.

```json
{
  "id": "proj_001",
  "nome": "Julia — Pia cozinha",
  "cliente": { "nome": "Julia", "telefone": "..." },
  "criadoEm": "2026-09-03",

  "bancada": {
    "formato": "L",
    "trechos": [
      { "comprimento": 2200, "profundidade": 600 },
      { "comprimento": 1800, "profundidade": 600 }
    ],
    "espessura": 20,
    "alturaInstalacao": 900
  },

  "material": {
    "id": "mat_branco_paraiso",
    "nome": "Granito Branco Paraíso",
    "texturaUrl": "/chapas/branco-paraiso.jpg",
    "precoM2": 480.00,
    "chapa": { "largura": 3200, "altura": 1900 }
  },

  "recortes": [
    {
      "tipo": "cuba_embutir",
      "modelo": "cuba_inox_56x34",
      "largura": 560, "profundidade": 340,
      "posicao": { "trecho": 0, "distanciaInicio": 500, "centralizada": true }
    },
    { "tipo": "furo_torneira", "diametro": 35, "posicao": {...} },
    { "tipo": "cooktop", "largura": 580, "profundidade": 500, "posicao": {...} }
  ],

  "complementos": [
    { "tipo": "frontao", "altura": 100, "trechos": [0, 1] },
    { "tipo": "saia",    "altura": 80,  "trechos": [0, 1] }
  ],

  "acabamentoBorda": {
    "tipo": "meia_esquadria",
    "precoMetroLinear": 90.00
  }
}
```

**Todas as medidas em milímetros, inteiros.** Nada de float, nada de misturar cm e m. Converte só na hora de exibir. Isso elimina uma classe inteira de bug de arredondamento em cálculo de preço.

---

## 4. O editor: paramétrico, não CAD

Essa era a parte que parecia mais difícil. Ela encolhe muito com a decisão certa.

**Bancada de marmoraria é quase sempre retilínea** — reto, L ou U, tudo em 90°. Então:

❌ Não faça: editor de polígono livre com vértice arrastável no toque
✅ Faça: o vendedor escolhe o formato num botão e digita o comprimento de cada trecho

Vira praticamente um formulário que se desenha sozinho. Cobre ~90% dos serviços reais.

### Formatos base

Nomenclatura confirmada pelo mercado (é a que o Simulador Marmoraria usa — adote igual, o vendedor já fala assim):

| Formato | Parâmetros |
|---|---|
| **Linear** | comprimento, profundidade |
| **Em L** | comprimento A, comprimento B, profundidade |
| **Em P** | comprimento A, B, profundidade (península — L com retorno curto) |
| **Em U** | comprimento A, B, C, profundidade |
| Personalizado | *fase 2 — só se pedirem* |

Ilha não é formato, é **ambiente** (ver seção 4.1) — a diferença é que as 4 bordas são acabadas e tem saia nos lados.

### Defaults que economizam digitação

- Profundidade cozinha: **600 mm**
- Profundidade banheiro: **550 mm**
- Altura de instalação: **900 mm**
- Espessura: **20 mm** (30 mm como opção)
- Frontão: **100 mm**
- Saia: **80 mm**

O vendedor só muda o que foge do padrão.

### 4.1 Estrutura de interface (validada pelo mercado)

O **Simulador Marmoraria** (`simuladormarmoraria.com.br`) usa exatamente a abordagem paramétrica descrita acima. Copie a estrutura de navegação, ela funciona:

**Quatro abas laterais fixas:**

| Aba | Conteúdo |
|---|---|
| **Pedras** | grid de materiais com foto da chapa |
| **Componentes** | área molhada, cuba, cooktop, furos |
| **Medidas** | formato (Linear/L/P/U) + comprimento + profundidade |
| **Ambientes** | presets: Pia · Gourmet · Banheiro · Ilha · Balcão |

**"Ambientes" é a sacada que vale roubar.** Em vez de começar do zero, o vendedor escolhe o tipo de serviço e o app já carrega os defaults certos — profundidade, altura, quais componentes fazem sentido, se tem frontão. Banheiro nasce com 55 cm, cozinha com 60 cm, ilha com borda acabada nos 4 lados. Corta metade da digitação.

**Vocabulário: "área molhada", não "cuba esculpida".** É o termo que o setor usa. Aparece como componente com comprimento próprio (ex: 1,00 m) e três formatos de canto — retangular, retangular com canto arredondado, e oval. Dá pra ter mais de uma na mesma peça ("Área molhada 2").

**Unidades na tela: centímetros.** O campo aceita `300` e mostra `3.00m` como referência acima. Internamente continua tudo em milímetros inteiros (seção 3) — converte só na entrada e na saída.

**Layout:** 3D ocupa a tela toda, controles flutuam por cima em painéis com fundo translúcido, CTA fixo embaixo. Funciona bem em tablet na horizontal, que é como o vendedor vai usar.

**Ponto de atenção no print:** o 3D deles é cinza claro, sem textura aplicada na peça — exatamente o "modo maquete" que eu descrevi na seção 6. É esse o padrão realista de entrega. Se você aplicar as fotos reais das chapas, já sai na frente deles.

### Como desenhar

**SVG puro**, não canvas. Motivo: as formas são retilíneas, as cotas são linhas e texto, e SVG exporta pro PDF sem perder qualidade. Konva/Fabric só valem se você for pro editor livre na fase 2.

O desenho é gerado a partir do JSON: monta o path do contorno, desenha as linhas de cota com as setas, posiciona os textos. Puramente derivado — nunca guarde coordenadas de tela no modelo.

---

## 5. Escala real na tela

Duas coisas diferentes, não confunda:

**Cotas corretas** (fácil, e é o que importa 95% do tempo): desenho em escala proporcional com os números visíveis. Uma bancada de 2,20 m não cabe 1:1 em tablet nenhum. Não force.

**1:1 de verdade** (só para detalhes): botão "1:1" que dá zoom no recorte da cuba, na espessura do frontão, no perfil da borda. Aí o cliente encosta a mão e sente o tamanho.

Para o 1:1 funcionar, o navegador precisa saber o DPI físico da tela — e ele não sabe. Solução: **tela de calibração**, feita uma vez por dispositivo e salva.

> O usuário encosta um cartão de crédito na tela e ajusta um retângulo até bater.
> Cartão tem **85,60 × 53,98 mm** fixos, padrão ISO/IEC 7810 ID-1, igual no mundo inteiro.

Do tamanho em pixels do retângulo ajustado você deriva o `pixelsPorMilimetro` do aparelho e guarda no localStorage.

---

## 6. O 3D é mais simples do que parece

Bancada é peça prismática. Não tem modelagem manual.

```
contorno 2D (que o vendedor já desenhou)
   → ExtrudeGeometry pela espessura
   → adiciona saia e frontão (mais extrusões)
   → subtrai os recortes
   → aplica a textura do material
```

Three.js resolve isso com `ExtrudeGeometry` direto do path SVG. Os recortes entram como `holes` no shape.

### Textura de pedra não repete

Isso é o detalhe que separa parecer profissional de parecer amador.

Veio de granito e mármore é **único**. Se você usar textura em tile, o cliente enxerga o padrão repetido na hora e o efeito morre.

Precisa de foto real das chapas do estoque da marmoraria, boa resolução, mapeada na peça inteira — UV esticado sobre a peça toda, não repetido. Isso significa pedir pra eles fotografarem o estoque. **Peça isso hoje**, porque é o item de prazo mais longo do projeto e não depende de você.

### Expectativa vs entrega

O render bonito de marketing (aquele mármore fotográfico da arte do Rocha Certa) **não é o que o app entrega**. O app entrega o 3D limpo, tipo maquete. A distância entre os dois é ~10x de esforço.

Alinhe isso com a marmoraria **antes de começar**.

---

## 7. Ver na vida real (AR)

Funciona hoje, sem instalar app, mas não com WebXR — **WebXR não roda no Safari do iPhone**.

O caminho é entregar o arquivo do modelo pro visualizador nativo do sistema:

| Plataforma | Visualizador | Formato |
|---|---|---|
| iOS | AR Quick Look | `.usdz` |
| Android | Scene Viewer | `.glb` (glTF) |

**`<model-viewer>` do Google** embrulha os dois num componente só. Você joga a tag na página e o botão "ver na vida real" funciona nos dois, já em escala real automática.

Gerar os arquivos no cliente, sem servidor:

- `GLTFExporter` — vem no Three.js
- `USDZExporter` — **também vem no Three.js** (`three/examples/jsm/exporters/USDZExporter.js`)

Ou seja: dá pra fazer tudo no navegador. Sem conversão no backend.

---

## 8. Modo apresentação

Barato de fazer, alto impacto na venda.

Mesma cena 3D, com:

- Interface escondida
- Fundo neutro (cinza claro, gradiente suave)
- Iluminação melhor (HDRI de estúdio)
- Órbita lenta automática, ~8 segundos, rodando ao vivo (não precisa exportar vídeo)
- Cotas em overlay discreto

**O essencial:** esconder custo, margem e desconto máximo. Eles estão na tela do vendedor e não podem vazar quando o tablet vira.

---

## 9. Orçamento — onde o dinheiro se perde

**Bancada não é área × R$/m².**

A chapa vem em tamanho fixo e o retalho que sobra normalmente não se reaproveita. Se o app cobrar só a área desenhada, a marmoraria perde dinheiro em toda peça de formato ruim.

### Tamanhos de chapa (confirmar com o fornecedor deles)

| Material | Tamanho aproximado |
|---|---|
| Granito | 2,80–3,20 × 1,70–1,90 m |
| Mármore | 2,60–3,00 × 1,60–1,80 m |
| Quartzo / Silestone | 3,06 × 1,40 m |
| Silestone Jumbo | 3,25 × 1,59 m |

### Componentes do preço

```
1. m² de chapa consumida      × preço/m² do material
2. metro linear de borda      × preço do acabamento escolhido
3. recortes (valor fixo)      cuba, cooktop, furo de torneira, dosador
4. cuba esculpida             por peça (mão de obra alta)
5. complementos               frontão, saia, rodabanca, soleira, pingadeira
6. instalação                 fixo ou por m²
7. frete                      por faixa de distância
─────────────────────────────────────
   × fator de aproveitamento da chapa
```

### O cálculo de aproveitamento

Versão 1 (faça essa hoje): **retângulo envolvente**. A peça em L de 2200 × 1800 consome um retângulo de 2200 × 1800, não a área do L. É conservador e defensável.

Versão 2 (depois): nesting simples, verificando se o retalho do L comporta outra peça do mesmo projeto.

Deixe o **fator de aproveitamento configurável** na tela de admin. A marmoraria vai querer ajustar isso conforme a realidade deles.

### Tabela de preços — tela de admin

Tudo editável pelo dono, sem mexer em código:

- Preço/m² por material
- Preço/metro linear por tipo de acabamento
- Valor por tipo de recorte
- Valor de cuba esculpida
- Preços de complementos
- Instalação e frete por faixa
- Fator de aproveitamento
- Margem mínima e desconto máximo do vendedor

---

## 10. Documentos de saída

### Não é um documento, são três

Conflar os três é erro comum e caro. Todos saem do **mesmo JSON** (seção 3), só mudam o que mostram:

| Documento | Pra quem | Tem preço? | Serve pra |
|---|---|---|---|
| **Proposta comercial** | cliente | sim | fechar a venda |
| **Ordem de serviço** | oficina | **não** | cortar a peça certa |
| Ficha de medição | vendedor | não | conferir na obra *(fase 2)* |

Comece pela **proposta** — é a que a cliente pediu. Mas deixe a estrutura pronta pra ordem de serviço, porque é ela que evita o prejuízo: cortar errado queima uma chapa inteira.

### Proposta comercial

```
┌─────────────────────────────────────┐
│ [logo]        PROPOSTA Nº 2026-0142 │
│               Data · Validade       │
├─────────────────────────────────────┤
│ CLIENTE                             │
│ Nome · Telefone · Endereço          │
│ Projeto: "Julia — Pia cozinha"      │
├─────────────────────────────────────┤
│                                     │
│        [ DESENHO 2D COTADO ]        │
│                                     │
├─────────────────────────────────────┤
│ ESPECIFICAÇÃO                       │
│ Ambiente:     Cozinha               │
│ Formato:      Em L                  │
│ Medidas:      220 × 180 × 60 cm     │
│ Espessura:    2 cm                  │
│ Material:     Granito Branco Paraíso│
│ Acabamento:   Meia-esquadria        │
│ Área molhada: 100 × 45 cm, oval     │
│ Frontão:      10 cm                 │
│ Cooktop:      recorte 58 × 50 cm    │
├─────────────────────────────────────┤
│ VALORES                             │
│ Bancada 3,96 m²           R$ ...    │
│ Acabamento 7,60 m linear  R$ ...    │
│ Área molhada esculpida    R$ ...    │
│ Recorte cooktop           R$ ...    │
│ Frontão                   R$ ...    │
│ Instalação                R$ ...    │
│ ─────────────────────────────────   │
│ TOTAL                     R$ ...    │
├─────────────────────────────────────┤
│ Prazo de entrega · Forma de pagamento│
│ Dados da marmoraria · CNPJ          │
└─────────────────────────────────────┘
```

**Numeração sequencial** (`2026-0142`) desde o dia 1. A marmoraria vai precisar referenciar proposta por número no telefone.

**Sem custo e sem margem.** Esse documento vai pro cliente.

### Ordem de serviço (deixe preparado)

Mesmos dados, sem valores, mais o que a oficina precisa:

- Medidas de **corte**, não de instalação
- Posição exata de cada recorte, cotada a partir da borda
- Qual chapa do estoque usar
- Tipo de acabamento por borda (nem toda borda leva o mesmo)
- Quais bordas ficam contra a parede (não levam acabamento)
- Espaço pra assinatura de quem conferiu

### Como implementar: HTML + CSS de impressão

**Não use pdf-lib nem jsPDF agora.** Faça uma página HTML com `@media print`.

Motivo: isso resolve os dois caminhos de uma vez, sem você decidir nada.

- **Imprimir** → funciona direto
- **PDF** → o próprio diálogo de impressão tem "Salvar como PDF"
- **WhatsApp** → no iPhone, compartilhar → PDF → WhatsApp. No Android, igual.

Ou seja: uma implementação, três saídas. Você não precisa escolher hoje.

```css
@page {
  size: A4 portrait;
  margin: 15mm;
}

@media print {
  .app-ui { display: none; }        /* esconde a interface */
  .documento { display: block; }
  .quebra { break-before: page; }
  .nao-quebrar { break-inside: avoid; }
}
```

Bônus: o **SVG do desenho entra inline no HTML**, sem conversão nenhuma, e imprime vetorial em qualquer resolução. Com pdf-lib você teria trabalho pra isso.

Só migre pra geração de PDF no servidor se depois precisar mandar automático por e-mail, ou anexar sem passar pelo diálogo de impressão.

---

## 11. Offline é requisito, não luxo

O vendedor vai **medir na casa do cliente**, muitas vezes sem sinal.

- PWA com service worker
- IndexedDB (use `Dexie`) para os projetos locais
- Texturas das chapas em cache
- Sincroniza quando voltar o sinal
- Indicador visual claro de "salvo localmente" vs "sincronizado"

---

## 12. Stack sugerida

| Camada | Escolha | Porquê |
|---|---|---|
| Base | React + Vite + TypeScript | TS não é opcional aqui — o modelo de dados é o coração |
| 2D | SVG puro | retilíneo, exporta vetorial pro PDF |
| 3D | Three.js + react-three-fiber | ExtrudeGeometry resolve a peça toda |
| AR | `<model-viewer>` + GLTFExporter + USDZExporter | funciona em iOS e Android sem backend |
| Estado | Zustand | leve, e o modelo é um objeto só |
| Offline | Dexie + PWA | |
| Backend | Supabase | auth, Postgres e storage prontos, bom pra dev solo |
| Documento | HTML + `@media print` | imprime, vira PDF e vai pro WhatsApp com uma implementação só |
| Deploy | Vercel | |

---

## 13. Posicionamento contra os concorrentes

Dois já mapeados:

| | Rocha Certa | Simulador Marmoraria |
|---|---|---|
| Público | cliente final | cliente final (lead) |
| Preço | R$ 10/mês | — |
| Saída | projeto no celular | **"Enviar projeto"** → a marmoraria orça depois |
| Calcula preço? | — | **Não** |

### A brecha

Repare no CTA do Simulador: *"Monte sua bancada, escolha o material e **solicite seu orçamento**."*

Os dois são **ferramenta de captação de lead**. O cliente monta, manda, e alguém da marmoraria orça na mão depois — provavelmente em planilha, provavelmente no dia seguinte.

**O seu é outro produto.** É ferramenta de fechamento na mão do vendedor, com preço final saindo na hora, na frente do cliente, com margem controlada. Isso não é uma versão melhor do que existe — é a etapa seguinte do funil.

Diga isso com essas palavras pra marmoraria. Muda a conversa de "quanto custa um simulador" pra "quanto vale fechar a venda na primeira visita".

### O que justifica cobrar caro

- **Tabela de preço própria**, com margem real e regra de desconto por vendedor
- **Estoque de chapa real**, com foto das peças que eles têm no galpão hoje
- **Cálculo de aproveitamento de chapa** — nenhum dos dois faz isso (seção 9)
- PDF com a marca deles, pronto pro WhatsApp
- Funciona offline, na casa do cliente
- Integração com o sistema de gestão que já usam

**O desenho é commodity — dez reais por mês.** O orçamento correto não é. Venda o orçamento.

### O que copiar sem culpa

- Nomenclatura: Linear / Em L / Em P / Em U, "área molhada"
- Presets por ambiente (Pia, Gourmet, Banheiro, Ilha, Balcão)
- Quatro abas: Pedras, Componentes, Medidas, Ambientes
- Entrada em cm com o metro como referência
- 3D em tela cheia com painéis flutuantes

---

## 14. Ordem de ataque

### Hoje à tarde
1. Modelar o JSON do projeto (seção 3) — **começa por aqui, tudo depende disso**
2. Renderizador SVG: JSON → desenho 2D com cotas
3. Formulário de formato: Linear e Em L, com os defaults
4. Presets de ambiente (seção 4.1) — é barato e corta metade da digitação
5. Cálculo de orçamento com retângulo envolvente

Ao fim disso você tem o núcleo funcionando. Todo o resto pendura nele.

### Depois
5. Recortes (cuba, cooktop, torneira)
6. Complementos (frontão, saia)
7. 3D via ExtrudeGeometry
8. Tela de admin da tabela de preços
9. Proposta comercial (HTML de impressão)
10. Ordem de serviço pra oficina
10. Modo apresentação
11. AR
12. Offline / PWA
13. Calibração de tela e botão 1:1

### Fora do seu caminho crítico — peça hoje
- **Fotos das chapas do estoque**, boa resolução
- **Tabela de preços real** deles (m², acabamentos, recortes, instalação, frete)
- Tamanho das chapas que os fornecedores entregam
- Logo e dados pro PDF

---

## 15. Armadilhas

| Risco | Como evitar |
|---|---|
| 2D e 3D divergirem | Um modelo de dados só. Tudo é view. |
| Textura repetida denunciar o app | Fotos reais das chapas, UV esticado na peça inteira |
| Cliente esperar render fotográfico | Alinhar expectativa antes de começar |
| Bug de arredondamento no preço | Milímetros inteiros em todo lugar |
| Preço abaixo do custo em peça de formato ruim | Fator de aproveitamento + retângulo envolvente |
| Perder projeto por falta de sinal | Offline desde o começo, não depois |
| Custo/margem vazar pro cliente | Modo apresentação separado |
| Escopo explodir no editor livre | Paramétrico primeiro. Livre só se pedirem. |
