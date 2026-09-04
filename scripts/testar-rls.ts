/**
 * Teste de RLS — conecta usando SÓ a anon key, SEM login, e tenta ler cada
 * tabela. Qualquer tabela que devolver linha está FURADA.
 *
 * Rodar ANTES de qualquer dado real entrar no Supabase:
 *
 *   node --env-file=.env.local scripts/testar-rls.ts
 *
 * (precisa de Node 22.18+ para rodar .ts direto; senão: `npx tsx scripts/testar-rls.ts`)
 *
 * Sai com código 1 se alguma tabela vazar.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(
    "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ex.: --env-file=.env.local).",
  );
  process.exit(2);
}

// cliente anônimo, sem sessão, sem persistência
const sb = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// toda tabela/estrutura exposta pela API. Nenhuma pode devolver linha para o anon.
const ALVOS = [
  "empresas",
  "perfis",
  "catalogo_pedras",
  "catalogo_pedras_custo",
  "tabela_precos",
  "tabela_precos_margem",
  "projetos",
  "proposta_contador",
];

let furadas = 0;

for (const t of ALVOS) {
  const { data, error } = await sb.from(t).select("*").limit(1);

  if (error) {
    // RLS negando / tabela inexistente / API desligada => OK
    console.log(`  ok    ${t.padEnd(24)} — sem acesso (${error.code ?? error.message})`);
    continue;
  }
  if (Array.isArray(data) && data.length === 0) {
    console.log(`  ok    ${t.padEnd(24)} — 0 linhas`);
    continue;
  }
  furadas++;
  console.error(
    `  FURA  ${t.padEnd(24)} — devolveu ${data?.length} linha(s) para o anon!`,
  );
  console.error(`        amostra: ${JSON.stringify(data?.[0])}`);
}

// também testa as funções RPC sensíveis
for (const fn of ["proximo_numero_proposta", "auth_empresa_id", "auth_papel"]) {
  const { data, error } = await sb.rpc(fn);
  if (error) {
    console.log(`  ok    rpc:${fn.padEnd(20)} — negado (${error.code ?? error.message})`);
  } else {
    furadas++;
    console.error(`  FURA  rpc:${fn.padEnd(20)} — executou para o anon: ${JSON.stringify(data)}`);
  }
}

console.log("");
if (furadas > 0) {
  console.error(`❌ ${furadas} vazamento(s). NÃO coloque dado real até fechar tudo.`);
  process.exit(1);
}
console.log("✅ Nenhum vazamento: o anon não lê nada.");
