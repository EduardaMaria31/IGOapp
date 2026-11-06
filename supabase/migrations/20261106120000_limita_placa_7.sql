-- Limita a placa a no maximo 7 caracteres (ABC1234 ou Mercosul ABC1D23).
-- Se existir placa com mais de 7 caracteres, o ALTER falha e nada e alterado:
-- apague ou corrija essas linhas antes (veja a consulta abaixo).
--   select id, placa from public.veiculo where length(placa) > 7;

alter table public.veiculo
  alter column placa type varchar(7);
