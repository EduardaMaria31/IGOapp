-- Adiciona suporte a preço diferente por pátio

alter table public.tabela_preco
  add column if not exists patio_id integer references public.patio(id);

-- Backfill: linhas existentes passam a valer para o primeiro pátio cadastrado
-- (ajuste o uuid abaixo se necessário no seu ambiente)
update public.tabela_preco
set patio_id = (select id from public.patio order by id limit 1)
where patio_id is null;

-- Clona os preços existentes para os demais pátios que ainda não têm registro
insert into public.tabela_preco (uuid, patio_id, tipo_veiculo, valor_hora, valor_fracao, tolerancia_minutos)
select gen_random_uuid()::text, p.id, tp.tipo_veiculo, tp.valor_hora, tp.valor_fracao, tp.tolerancia_minutos
from public.patio p
cross join (
  select distinct tipo_veiculo, valor_hora, valor_fracao, tolerancia_minutos
  from public.tabela_preco
) tp
where not exists (
  select 1 from public.tabela_preco existente
  where existente.patio_id = p.id and existente.tipo_veiculo = tp.tipo_veiculo
);

alter table public.tabela_preco
  alter column patio_id set not null;

alter table public.tabela_preco
  add constraint uq_tabela_preco_patio_tipo unique (patio_id, tipo_veiculo);

-- Atualiza a trigger para considerar o pátio da vaga ao calcular o valor
create or replace function public.calcular_valor_transacao()
returns trigger
language plpgsql
as $$
declare
  v_tipo_veiculo varchar;
  v_patio_id integer;
  v_valor_hora numeric;
  v_valor_fracao numeric;
  v_tolerancia integer;
  v_duracao_minutos numeric;
  v_horas_completas integer;
  v_minutos_restantes numeric;
begin
  if new.hora_saida is not null then

    select tipo_veiculo into v_tipo_veiculo
    from public.veiculo
    where id = new.veiculo_id;

    select patio_id into v_patio_id
    from public.vaga
    where id = new.vaga_id;

    select valor_hora, valor_fracao, tolerancia_minutos
    into v_valor_hora, v_valor_fracao, v_tolerancia
    from public.tabela_preco
    where tipo_veiculo = v_tipo_veiculo
      and patio_id = v_patio_id
    limit 1;

    if v_valor_hora is null then
      raise exception 'Nenhuma tabela de preco cadastrada para o tipo de veiculo % no patio %', v_tipo_veiculo, v_patio_id;
    end if;

    v_duracao_minutos := extract(epoch from (new.hora_saida - new.hora_entrada)) / 60;

    if v_duracao_minutos <= v_tolerancia then
      new.valor_calculado := 0;
    else
      v_horas_completas := floor(v_duracao_minutos / 60);
      v_minutos_restantes := v_duracao_minutos - (v_horas_completas * 60);

      new.valor_calculado := (v_horas_completas * v_valor_hora)
        + (case when v_minutos_restantes > 0 then v_valor_fracao else 0 end);
    end if;

    new.status := 'finalizada';
  end if;

  return new;
end;
$$;
