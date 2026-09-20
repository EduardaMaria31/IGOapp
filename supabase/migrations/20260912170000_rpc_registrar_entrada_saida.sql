-- Funcoes RPC usadas pelo front para registrar entrada e saida de veiculos.
-- SECURITY DEFINER: quem chama so precisa estar autenticado, a funcao
-- garante a atomicidade (transacao + status da vaga sempre juntos).

create or replace function public.registrar_entrada(p_veiculo_id integer, p_vaga_id integer, p_operador_id integer)
returns transacao
language plpgsql
security definer
as $$
declare
  v_transacao public.transacao;
  v_status_vaga varchar;
begin
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

create or replace function public.registrar_saida(p_transacao_id integer)
returns transacao
language plpgsql
security definer
as $$
declare
  v_transacao public.transacao;
begin
  update public.transacao
  set hora_saida = now()
  where id = p_transacao_id
  returning * into v_transacao;

  if v_transacao.id is null then
    raise exception 'Transacao % nao encontrada', p_transacao_id;
  end if;

  update public.vaga
  set status = 'livre'
  where id = v_transacao.vaga_id;

  return v_transacao;
end;
$$;
