-- Liga a tabela usuario ao Supabase Auth
alter table public.usuario
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

-- Remove a senha manual: autenticação passa a ser 100% via Supabase Auth
alter table public.usuario
  drop column if exists senha_hash;
