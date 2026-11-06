-- Impede registrar uma nova entrada para um veiculo que ja esta no patio
-- (um veiculo nao pode ter mais de uma transacao em aberto, ou seja, com hora_saida nula).
-- Mesma assinatura da funcao anterior: o front-end continua chamando igual.

create or replace function public.registrar_entrada(p_veiculo_id integer, p_vaga_id integer, p_operador_id integer)
returns transacao
language plpgsql
security definer
as $$
declare
  v_transacao public.transacao;
  v_status_vaga varchar;
  v_placa varchar;
  v_vaga_atual text;
begin
  -- Trava por veiculo ate o fim da transacao: duas entradas simultaneas da
  -- mesma placa nao conseguem passar juntas pela verificacao abaixo.
  perform pg_advisory_xact_lock(p_veiculo_id);

  select v.placa, va.numero::text
    into v_placa, v_vaga_atual
  from public.transacao t
  join public.veiculo v  on v.id  = t.veiculo_id
  join public.vaga    va on va.id = t.vaga_id
  where t.veiculo_id = p_veiculo_id
    and t.hora_saida is null
  limit 1;

  if v_placa is not null then
    raise exception 'A placa % ja esta no patio (vaga %). Registre a saida antes de uma nova entrada.', v_placa, v_vaga_atual;
  end if;

  select status into v_status_vaga from public.vaga where id = p_vaga_id;

  if v_status_vaga is null then
    raise exception 'Vaga % nao encontrada', p_vaga_id;
  end if;

  if v_status_vaga = 'ocupada' then
    raise exception 'Vaga % ja esta ocupada', p_vaga_id;
  end if;

  insert into public.transacao (uuid, veiculo_id, vaga_id, operador_id, hora_entrada, status)
  values (gen_random_uuid()::text, p_veiculo_id, p_vaga_id, p_operador_id, now(), 'em_andamento')
  returning * into v_transacao;

  update public.vaga set status = 'ocupada' where id = p_vaga_id;

  return v_transacao;
end;
$$;
