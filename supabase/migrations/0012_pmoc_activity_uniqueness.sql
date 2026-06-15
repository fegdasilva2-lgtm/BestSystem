-- Migration 0012 - permite repetir o mesmo template de atividade por ativo
-- dentro de um PMOC. O codigo LIMPAR-FILTRO, por exemplo, precisa existir
-- para cada equipamento HVAC do plano.

alter table public.pmoc_activities
  drop constraint if exists pmoc_activities_pmoc_plan_id_code_key;

alter table public.pmoc_activities
  add constraint pmoc_activities_plan_asset_code_key
  unique (pmoc_plan_id, asset_id, code);
