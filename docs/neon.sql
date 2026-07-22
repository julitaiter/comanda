create extension if not exists pgcrypto;

create table if not exists comandas (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  status text not null default 'open',
  admin_token text not null,
  expires_at timestamptz not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comandas_code on comandas (code);
create index if not exists idx_comandas_expires_at on comandas (expires_at);
