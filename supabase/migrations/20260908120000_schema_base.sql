-- Schema base do projeto ParkIA
-- Reconstrução das tabelas originais (criadas via Table Editor do Supabase)

create table if not exists public.patio (
  id serial primary key,
  uuid varchar unique,
  nome varchar not null,
  endereco text,
  capacidade_total integer
);

create table if not exists public.tabela_preco (
  id serial primary key,
  uuid varchar unique,
  tipo_veiculo varchar not null,
  valor_hora numeric not null,
  valor_fracao numeric not null,
  tolerancia_minutos integer not null
);

create table if not exists public.vaga (
  id serial primary key,
  uuid varchar unique,
  patio_id integer references public.patio(id),
  numero varchar not null,
  tipo varchar not null,
  status varchar not null default 'livre'
);

create table if not exists public.usuario (
  id serial primary key,
  uuid varchar unique,
  nome varchar not null,
  email varchar unique not null,
  tipo varchar,
  perfil varchar not null,
  status varchar not null default 'ativo',
  criado_em timestamp default current_timestamp
);

create table if not exists public.veiculo (
  id serial primary key,
  uuid varchar unique,
  placa varchar unique not null,
  modelo varchar,
  tipo_veiculo varchar not null,
  proprietario_nome varchar,
  proprietario_telefone varchar
);

create table if not exists public.transacao (
  id serial primary key,
  uuid varchar unique,
  veiculo_id integer references public.veiculo(id),
  vaga_id integer references public.vaga(id),
  operador_id integer references public.usuario(id),
  hora_entrada timestamp not null default current_timestamp,
  hora_saida timestamp,
  valor_calculado numeric,
  status varchar not null
);
