-- =============================================================================
-- Vértice Mármores — schema Supabase
-- =============================================================================
-- Região do projeto: São Paulo — sa-east-1.  ⚠️ NÃO DÁ PARA MUDAR DEPOIS.
--
-- Multi-tenant desde o dia 1 (`empresa_id` em TODAS as tabelas), mesmo com uma
-- empresa só. Retrofitar isso depois, com dados em produção, é migração perigosa.
--
-- Row Level Security LIGADA em TODAS as tabelas, sem exceção. Políticas
-- explícitas por operação (select / insert / update / delete).
--
-- Papéis (em `perfis.papel`): 'admin' e 'vendedor'.
--   - vendedor: lê catálogo com PREÇO DE VENDA, edita e cria projetos.
--   - admin: tudo do vendedor + lê CUSTO e MARGEM, edita tabela de preços.
--   Custo e margem ficam em tabelas separadas (`*_custo`, `*_margem`) para que
--   o cliente do vendedor nunca receba esses bytes — RLS resolve por completo.
--
-- Cadastro público: DESABILITADO. No painel do Supabase:
--   Authentication → Providers → Email → "Enable email signups" = OFF.
--   Usuários são criados pelo admin (Auth → Users → Add user) ou por convite.
--   O trigger `on_auth_user_created` abaixo cria o `perfis` correspondente.
--
-- Rodar este arquivo inteiro no SQL Editor do Supabase.
-- Depois rodar `scripts/testar-rls.ts` com a anon key ANTES de qualquer dado real.
-- =============================================================================

-- extensões
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- =============================================================================
-- 0. Helpers de autorização (SECURITY DEFINER — leem perfis sem recursão de RLS)
-- =============================================================================
-- empresa do usuário logado
create or replace function public.auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.perfis where id = auth.uid()
$$;

-- papel do usuário logado ('admin' | 'vendedor' | null)
create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.auth_e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_papel() = 'admin', false)
$$;

create or replace function public.auth_e_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_papel() in ('admin', 'vendedor')
$$;

-- =============================================================================
-- 1. empresas  (tenant)
-- =============================================================================
create table if not exists public.empresas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  cnpj           text,
  telefone       text,
  cidade         text,
  prazo_entrega  text not null default 'A combinar',
  forma_pagamento text not null default 'A combinar',
  validade_dias  integer not null default 15,
  criado_em      timestamptz not null default now()
);

alter table public.empresas enable row level security;

-- membros leem a própria empresa; ninguém insere/deleta pelo cliente
create policy empresas_select on public.empresas
  for select using (id = public.auth_empresa_id() and public.auth_e_membro());
create policy empresas_update on public.empresas
  for update using (id = public.auth_empresa_id() and public.auth_e_admin())
             with check (id = public.auth_empresa_id() and public.auth_e_admin());
-- sem policy de insert/delete => negado para todo cliente (só service_role)

-- =============================================================================
-- 2. perfis  (1:1 com auth.users)
-- =============================================================================
create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete restrict,
  papel       text not null default 'vendedor' check (papel in ('admin', 'vendedor')),
  nome        text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create index if not exists perfis_empresa_idx on public.perfis (empresa_id);

alter table public.perfis enable row level security;

-- cada um lê o próprio perfil
create policy perfis_select_self on public.perfis
  for select using (id = auth.uid());
-- admin lê e gerencia os perfis da própria empresa
create policy perfis_select_admin on public.perfis
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy perfis_insert_admin on public.perfis
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy perfis_update_admin on public.perfis
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_admin())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy perfis_delete_admin on public.perfis
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());

-- trigger: ao criar usuário no Auth, cria o perfil.
-- A empresa vem de user_metadata.empresa_id (setado pelo admin ao convidar);
-- se ausente, cai na primeira empresa cadastrada (cenário "uma empresa só").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  emp uuid;
begin
  emp := nullif(new.raw_user_meta_data ->> 'empresa_id', '')::uuid;
  if emp is null then
    select id into emp from public.empresas order by criado_em limit 1;
  end if;
  insert into public.perfis (id, empresa_id, papel, nome)
  values (
    new.id,
    emp,
    coalesce(new.raw_user_meta_data ->> 'papel', 'vendedor'),
    new.raw_user_meta_data ->> 'nome'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 3. catalogo_pedras  (lado do PREÇO DE VENDA — vendedor + admin leem)
-- =============================================================================
create table if not exists public.catalogo_pedras (
  id            text not null,
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  nome          text not null,
  familia       text not null,
  textura_url   text,
  cor_fallback  text,
  preco_m2      numeric(10,2) not null,        -- PREÇO DE VENDA (não sigiloso)
  chapa_largura integer not null,             -- mm
  chapa_altura  integer not null,             -- mm
  ativo         boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, id)
);

alter table public.catalogo_pedras enable row level security;

create policy catalogo_select on public.catalogo_pedras
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_membro());
create policy catalogo_insert on public.catalogo_pedras
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy catalogo_update on public.catalogo_pedras
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_admin())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy catalogo_delete on public.catalogo_pedras
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());

-- =============================================================================
-- 4. catalogo_pedras_custo  (CUSTO — SÓ ADMIN, em qualquer operação)
-- =============================================================================
create table if not exists public.catalogo_pedras_custo (
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  pedra_id    text not null,
  custo_m2    numeric(10,2) not null,          -- 🔒 SIGILOSO
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, pedra_id),
  foreign key (empresa_id, pedra_id)
    references public.catalogo_pedras (empresa_id, id) on delete cascade
);

alter table public.catalogo_pedras_custo enable row level security;

-- nenhuma policy para 'vendedor' => vendedor não lê nem 1 byte de custo
create policy custo_select_admin on public.catalogo_pedras_custo
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy custo_insert_admin on public.catalogo_pedras_custo
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy custo_update_admin on public.catalogo_pedras_custo
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_admin())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy custo_delete_admin on public.catalogo_pedras_custo
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());

-- =============================================================================
-- 5. tabela_precos  (config de VENDA — vendedor lê, admin edita)  1 linha/empresa
-- =============================================================================
create table if not exists public.tabela_precos (
  empresa_id           uuid primary key references public.empresas (id) on delete cascade,
  acabamento_borda     jsonb not null,   -- { reto: 45, boleado: 70, ... }
  recorte              jsonb not null,   -- { area_molhada: 350, cooktop: 80, ... }
  complemento          jsonb not null,   -- { frontao: 120, saia: 150, ... }
  instalacao           jsonb not null,   -- { fixo: 250, porM2: 0 }
  frete                jsonb not null,   -- [ { ateKm: 15, valor: 80 }, ... ]
  fator_aproveitamento numeric(4,2) not null default 1.0,
  atualizado_em        timestamptz not null default now()
);

alter table public.tabela_precos enable row level security;

create policy precos_select on public.tabela_precos
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_membro());
create policy precos_insert on public.tabela_precos
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy precos_update on public.tabela_precos
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_admin())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy precos_delete on public.tabela_precos
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());

-- =============================================================================
-- 6. tabela_precos_margem  (MARGEM / DESCONTO — SÓ ADMIN)
-- =============================================================================
create table if not exists public.tabela_precos_margem (
  empresa_id         uuid primary key references public.empresas (id) on delete cascade,
  margem_minima_pct  numeric(5,2) not null default 25,   -- 🔒 SIGILOSO
  desconto_maximo_pct numeric(5,2) not null default 10,  -- 🔒 SIGILOSO
  atualizado_em      timestamptz not null default now()
);

alter table public.tabela_precos_margem enable row level security;

create policy margem_select_admin on public.tabela_precos_margem
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy margem_insert_admin on public.tabela_precos_margem
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy margem_update_admin on public.tabela_precos_margem
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_admin())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_admin());
create policy margem_delete_admin on public.tabela_precos_margem
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_admin());

-- =============================================================================
-- 7. projetos  (o modelo único, seção 3, guardado como JSONB)
-- =============================================================================
create table if not exists public.projetos (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  numero           text,                       -- "2026-0142" atribuído no envio
  nome             text not null default '',
  cliente_nome     text,
  cliente_tel      text,
  cliente_endereco text,
  ambiente         text not null,
  snapshot         jsonb not null,             -- objeto Projeto inteiro
  total            numeric(12,2),
  status           text not null default 'rascunho'
                     check (status in ('rascunho', 'enviado', 'fechado', 'perdido')),
  criado_por       uuid references public.perfis (id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (empresa_id, numero)
);

create index if not exists projetos_empresa_idx  on public.projetos (empresa_id);
create index if not exists projetos_cliente_idx  on public.projetos (empresa_id, cliente_nome);
create index if not exists projetos_status_idx   on public.projetos (empresa_id, status);

alter table public.projetos enable row level security;

-- qualquer membro (admin ou vendedor) opera nos projetos da PRÓPRIA empresa
create policy projetos_select on public.projetos
  for select using (empresa_id = public.auth_empresa_id() and public.auth_e_membro());
create policy projetos_insert on public.projetos
  for insert with check (empresa_id = public.auth_empresa_id() and public.auth_e_membro());
create policy projetos_update on public.projetos
  for update using (empresa_id = public.auth_empresa_id() and public.auth_e_membro())
             with check (empresa_id = public.auth_empresa_id() and public.auth_e_membro());
-- exclusão de verdade (LGPD): DELETE apaga a linha e o cliente junto
create policy projetos_delete on public.projetos
  for delete using (empresa_id = public.auth_empresa_id() and public.auth_e_membro());

-- numeração sequencial da proposta, por empresa
create table if not exists public.proposta_contador (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ano        integer not null,
  valor      integer not null default 0,
  primary key (empresa_id, ano)
);

alter table public.proposta_contador enable row level security;
-- ninguém mexe direto; só a função abaixo (SECURITY DEFINER)
-- (sem policies => negado a todo cliente)

create or replace function public.proximo_numero_proposta()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  emp uuid := public.auth_empresa_id();
  a   integer := extract(year from now())::int;
  v   integer;
begin
  if emp is null or not public.auth_e_membro() then
    raise exception 'sem permissão';
  end if;
  insert into public.proposta_contador (empresa_id, ano, valor)
  values (emp, a, 1)
  on conflict (empresa_id, ano)
    do update set valor = public.proposta_contador.valor + 1
  returning valor into v;
  return a::text || '-' || lpad(v::text, 4, '0');
end;
$$;

-- =============================================================================
-- 8. touch de atualizado_em
-- =============================================================================
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists projetos_touch on public.projetos;
create trigger projetos_touch before update on public.projetos
  for each row execute function public.touch_atualizado_em();

-- =============================================================================
-- FIM. Checklist antes de dados reais:
--   [ ] "Enable email signups" = OFF no painel Auth
--   [ ] rodar scripts/testar-rls.ts com a anon key (nenhuma tabela pode devolver linha)
--   [ ] criar a empresa e o primeiro usuário admin via painel / service_role
-- =============================================================================
