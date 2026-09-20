-- Função auxiliar: verifica se o usuário logado é administrador
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.usuario
    where auth_user_id = auth.uid()
    and perfil = 'administrador'
  );
$$;

-- ===== USUARIO =====
create policy "usuario_select_proprio_ou_admin"
  on public.usuario for select
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "usuario_insert_proprio_cadastro"
  on public.usuario for insert
  with check (auth_user_id = auth.uid());

create policy "usuario_update_proprio_ou_admin"
  on public.usuario for update
  using (auth_user_id = auth.uid() or public.is_admin());

create policy "usuario_delete_admin"
  on public.usuario for delete
  using (public.is_admin());

-- ===== PATIO =====
create policy "patio_select_autenticado"
  on public.patio for select
  to authenticated using (true);

create policy "patio_insert_admin"
  on public.patio for insert
  with check (public.is_admin());

create policy "patio_update_admin"
  on public.patio for update
  using (public.is_admin());

create policy "patio_delete_admin"
  on public.patio for delete
  using (public.is_admin());

-- ===== TABELA_PRECO =====
create policy "tabela_preco_select_autenticado"
  on public.tabela_preco for select
  to authenticated using (true);

create policy "tabela_preco_write_admin"
  on public.tabela_preco for insert
  with check (public.is_admin());

create policy "tabela_preco_update_admin"
  on public.tabela_preco for update
  using (public.is_admin());

create policy "tabela_preco_delete_admin"
  on public.tabela_preco for delete
  using (public.is_admin());

-- ===== VAGA =====
create policy "vaga_select_autenticado"
  on public.vaga for select
  to authenticated using (true);

create policy "vaga_insert_autenticado"
  on public.vaga for insert
  to authenticated with check (true);

create policy "vaga_update_autenticado"
  on public.vaga for update
  to authenticated using (true);

create policy "vaga_delete_admin"
  on public.vaga for delete
  using (public.is_admin());

-- ===== VEICULO =====
create policy "veiculo_select_autenticado"
  on public.veiculo for select
  to authenticated using (true);

create policy "veiculo_insert_autenticado"
  on public.veiculo for insert
  to authenticated with check (true);

create policy "veiculo_update_autenticado"
  on public.veiculo for update
  to authenticated using (true);

create policy "veiculo_delete_admin"
  on public.veiculo for delete
  using (public.is_admin());

-- ===== TRANSACAO =====
create policy "transacao_select_autenticado"
  on public.transacao for select
  to authenticated using (true);

create policy "transacao_insert_autenticado"
  on public.transacao for insert
  to authenticated with check (true);

create policy "transacao_update_autenticado"
  on public.transacao for update
  to authenticated using (true);

create policy "transacao_delete_admin"
  on public.transacao for delete
  using (public.is_admin());
