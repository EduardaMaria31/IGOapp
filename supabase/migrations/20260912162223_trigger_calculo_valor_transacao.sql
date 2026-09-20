create or replace function public.calcular_valor_transacao()
returns trigger
language plpgsql
as $$
declare
  v_tipo_veiculo varchar;
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

    select valor_hora, valor_fracao, tolerancia_minutos
    into v_valor_hora, v_valor_fracao, v_tolerancia
    from public.tabela_preco
    where tipo_veiculo = v_tipo_veiculo
    limit 1;

    if v_valor_hora is null then
      raise exception 'Nenhuma tabela de preco cadastrada para o tipo de veiculo: %', v_tipo_veiculo;
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

drop trigger if exists trg_calcular_valor_transacao on public.transacao;

create trigger trg_calcular_valor_transacao
before insert or update on public.transacao
for each row
execute function public.calcular_valor_transacao();
