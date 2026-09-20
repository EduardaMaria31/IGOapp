-- Dados de teste do ParkIA
-- 2 pátios, tabela de preços, 18 vagas, 3 usuários, 8 veículos e 20 transações históricas

insert into public.patio (uuid, nome, endereco, capacidade_total) values
  ('patio-centro', 'Pátio Centro', 'Av. Boa Viagem, 1500 - Recife/PE', 8),
  ('patio-shopping', 'Pátio Shopping', 'Av. Domingos Ferreira, 800 - Recife/PE', 10);

insert into public.tabela_preco (uuid, tipo_veiculo, valor_hora, valor_fracao, tolerancia_minutos) values
  ('preco-carro', 'carro', 6.00, 3.00, 15),
  ('preco-moto', 'moto', 4.00, 2.00, 15);

insert into public.vaga (uuid, patio_id, numero, tipo, status)
select 'vaga-centro-' || gs,
       (select id from public.patio where uuid = 'patio-centro'),
       'C' || lpad(gs::text, 2, '0'),
       case when gs % 5 = 0 then 'mensalista' else 'rotativa' end,
       'livre'
from generate_series(1, 8) as gs;

insert into public.vaga (uuid, patio_id, numero, tipo, status)
select 'vaga-shopping-' || gs,
       (select id from public.patio where uuid = 'patio-shopping'),
       'S' || lpad(gs::text, 2, '0'),
       case when gs % 5 = 0 then 'mensalista' else 'rotativa' end,
       'livre'
from generate_series(1, 10) as gs;

insert into public.usuario (uuid, nome, email, tipo, perfil, status) values
  ('user-admin-1', 'Maria Eduarda Oliveira', 'maria.admin@parkia.com', 'interno', 'administrador', 'ativo'),
  ('user-operador-1', 'João Operador', 'joao.operador@parkia.com', 'interno', 'operador', 'ativo'),
  ('user-operador-2', 'Ana Operadora', 'ana.operadora@parkia.com', 'interno', 'operador', 'ativo');

insert into public.veiculo (uuid, placa, modelo, tipo_veiculo, proprietario_nome, proprietario_telefone) values
  ('veic-1', 'ABC1A23', 'Honda Civic', 'carro', 'Carlos Silva', '81988887777'),
  ('veic-2', 'DEF4B56', 'Toyota Corolla', 'carro', 'Fernanda Souza', '81977776666'),
  ('veic-3', 'GHI7C89', 'Fiat Argo', 'carro', 'Bruno Costa', '81966665555'),
  ('veic-4', 'JKL0D12', 'Chevrolet Onix', 'carro', 'Patrícia Lima', '81955554444'),
  ('veic-5', 'MNO3E45', 'Honda CG 160', 'moto', 'Ricardo Alves', '81944443333'),
  ('veic-6', 'PQR6F78', 'Yamaha Factor', 'moto', 'Juliana Rocha', '81933332222'),
  ('veic-7', 'STU9G01', 'Volkswagen Gol', 'carro', 'Marcos Pereira', '81922221111'),
  ('veic-8', 'VWX2H34', 'Honda Biz', 'moto', 'Camila Torres', '81911110000');

-- Transações históricas finalizadas (últimos 15 dias)
insert into public.transacao (uuid, veiculo_id, vaga_id, operador_id, hora_entrada, hora_saida, status)
select
  'transacao-seed-' || gs,
  (select id from public.veiculo order by random() limit 1),
  (select id from public.vaga order by random() limit 1),
  (select id from public.usuario where perfil = 'operador' order by random() limit 1),
  entrada,
  entrada + make_interval(mins => (20 + floor(random()*280))::int),
  'em_andamento'
from generate_series(1, 15) as gs,
lateral (
  select (date_trunc('day', now() - (random() * interval '15 days'))
          + make_interval(hours => (7 + floor(random()*13))::int, mins => floor(random()*60)::int))::timestamp as entrada
) e;

-- Transações ativas (veículos ainda no pátio agora)
with vagas_ativas as (
  select id from public.vaga order by random() limit 5
)
insert into public.transacao (uuid, veiculo_id, vaga_id, operador_id, hora_entrada, status)
select
  'transacao-ativa-' || row_number() over (),
  (select id from public.veiculo order by random() limit 1),
  va.id,
  (select id from public.usuario where perfil = 'operador' order by random() limit 1),
  now() - make_interval(mins => (10 + floor(random()*230))::int),
  'em_andamento'
from vagas_ativas va;

update public.vaga
set status = 'ocupada'
where id in (select vaga_id from public.transacao where hora_saida is null);
