-- Cria a linha em public.usuario automaticamente quando alguem se cadastra
-- no Supabase Auth. SECURITY DEFINER: nao depende de sessao/confirmacao de
-- e-mail e ignora qualquer "perfil" que o front tente mandar (nasce sempre
-- como operador - virar admin e uma promocao manual feita depois).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuario (uuid, auth_user_id, nome, email, tipo, perfil, status)
  values (
    gen_random_uuid()::text,
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'interno',
    'operador',
    'ativo'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
