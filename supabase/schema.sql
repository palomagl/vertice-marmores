-- Esquema inicial — DF Mármores e Granitos (uma empresa, sem multi-tenant).
-- Rodar no SQL editor do Supabase. Ajustar RLS quando entrar autenticação.

-- ---------------------------------------------------------------------------
-- Catálogo de materiais (estoque real; foto da chapa vai no Storage)
-- ---------------------------------------------------------------------------
create table if not exists materiais (
  id              text primary key,
  nome            text not null,
  textura_url     text,
  cor_fallback    text,
  preco_m2        numeric(10,2) not null,
  custo_m2        numeric(10,2),
  chapa_largura   integer not null,   -- mm
  chapa_altura    integer not null,   -- mm
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tabela de preços — editável pelo dono (especificação, seção 9)
-- linha única; id fixo = 1
-- ---------------------------------------------------------------------------
create table if not exists tabela_precos (
  id                     integer primary key default 1,
  acabamento_borda       jsonb not null,   -- { reto: 45, boleado: 70, ... }
  recorte                jsonb not null,   -- { area_molhada: 350, cooktop: 80, ... }
  complemento            jsonb not null,   -- { frontao: 120, saia: 150, ... }
  instalacao             jsonb not null,   -- { fixo: 250, porM2: 0 }
  frete                  jsonb not null,   -- [ { ateKm: 15, valor: 80 }, ... ]
  fator_aproveitamento   numeric(4,2) not null default 1.0,
  margem_minima_pct      numeric(5,2) not null default 25,
  desconto_maximo_pct    numeric(5,2) not null default 10,
  atualizado_em          timestamptz not null default now(),
  constraint tabela_precos_singleton check (id = 1)
);

-- ---------------------------------------------------------------------------
-- Projetos — o modelo de dados único (seção 3) guardado como JSONB
-- ---------------------------------------------------------------------------
create table if not exists projetos (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,             -- "2026-0142" atribuído no envio
  nome           text not null default '',
  cliente_nome   text,
  cliente_tel    text,
  ambiente       text not null,
  snapshot       jsonb not null,          -- o objeto Projeto inteiro
  total          numeric(12,2),
  status         text not null default 'rascunho',  -- rascunho | enviado | fechado | perdido
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists projetos_cliente_idx on projetos (cliente_nome);
create index if not exists projetos_status_idx  on projetos (status);

-- ---------------------------------------------------------------------------
-- Numeração sequencial da proposta desde o dia 1 (seção 10)
-- ---------------------------------------------------------------------------
create sequence if not exists proposta_seq start 1;

create or replace function proximo_numero_proposta()
returns text language sql as $$
  select to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('proposta_seq')::text, 4, '0');
$$;
