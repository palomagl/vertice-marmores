# Segurança — Vértice Mármores

App de uso interno. Roda 100% local (Dexie/IndexedDB); Supabase ainda **não**
conectado. Deploy na Vercel com Deployment Protection ligada.

## Auditoria (última rodada)

| Item | Situação |
|---|---|
| Segredos no código-fonte (`SERVICE_ROLE`, `secret`, `password`…) | nenhum |
| `.env` no histórico do git | **nunca commitado** — só `.env.example` com valores em branco. `.gitignore` cobre `.env*`. Sem rotação necessária. |
| Variáveis `VITE_*` | só `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Ambas **públicas por design** (a segurança é a RLS). |
| XSS via nome/endereço do cliente | sem risco — nada de `innerHTML`/`dangerouslySetInnerHTML`; tudo renderizado como texto JSX (React escapa). |
| `npm audit` | 0 vulnerabilidades |
| PII em URL (querystring/hash) | não ocorre. Rotas estáticas. O link `wa.me` usa o telefone no caminho como **destinatário** (igual `mailto:`) e o texto não leva nome/telefone/endereço. |

### ⚠️ Custo e margem no bundle

`src/domain/catalogo.ts` (`custoM2`) e `src/domain/tabelaPrecos.ts`
(`margemMinimaPct`, `descontoMaximoPct`) **compilam no JavaScript** e são legíveis
por qualquer um com acesso ao deploy.

- **Mitigação hoje:** manter o Deployment Protection ligado. Os valores nesses
  arquivos são **placeholder** — não colocar os números reais da empresa.
- **Correção definitiva:** `supabase/schema.sql`. Custo fica em
  `catalogo_pedras_custo` e margem em `tabela_precos_margem`, ambas com RLS que
  só deixa o papel `admin` ler. O navegador do vendedor nunca recebe esses bytes.

## Cabeçalhos HTTP (`vercel.json`)

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`,
`Strict-Transport-Security: max-age=63072000; includeSubDomains`,
e **CSP em modo enforcing**:

```
default-src 'self'; img-src 'self' data: blob: https:;
style-src 'self' 'unsafe-inline'; script-src 'self';
connect-src 'self' https://*.supabase.co;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Testado localmente contra o build servido com esses headers em **todas as rotas**
(lista, editor 3D, 2D, amostras de pedra `data:`, proposta com SVG inline, ordem
de serviço, preços) — **zero violações, zero erros de console**. Por isso já foi
para enforcing. Se quiser cautela extra num deploy, trocar `Content-Security-Policy`
por `Content-Security-Policy-Report-Only` por alguns dias antes.

## Persistência local (o risco mais provável do app)

Safari iOS descarta o IndexedDB de site não instalado após ~7 dias sem uso.

- `src/lib/persistencia.ts` chama `navigator.storage.persist()` na inicialização
  e loga o resultado.
- `InstalarBanner` aparece fora do modo standalone com instruções para iOS/Android.
- **Backup .json** (`src/lib/backup.ts`): exportar 1 projeto, exportar todos,
  importar. Ida e volta preserva o dado (o `Projeto` é 100% serializável).
- A lista marca **"sem cópia"** todo projeto que nunca foi exportado nem
  sincronizado (`Projeto.exportadoEm`).
- ⚠️ O arquivo de backup contém PII do cliente. Guardar em local seguro.

## LGPD

- Nome/telefone/endereço nunca vão para querystring ou hash de URL.
- Exclusão de projeto é **definitiva** (`db.projetos.delete` — hard delete) e leva
  junto os dados do cliente daquele projeto. Na nuvem, o `DELETE` na tabela
  `projetos` faz o mesmo (não há soft-delete no schema).
- **CPF não é pedido** em lugar nenhum — não serve a este fluxo.

## Supabase — antes de conectar

1. Rodar `supabase/schema.sql` inteiro no SQL Editor. Região: **sa-east-1**.
2. Auth → Email → **desligar** "Enable email signups".
3. `npm run test:rls` (usa só a anon key, sem login) — **nenhuma tabela pode
   devolver linha**. Obrigatório passar antes de qualquer dado real.
4. Criar a empresa e o primeiro `admin` via painel / `service_role`.
