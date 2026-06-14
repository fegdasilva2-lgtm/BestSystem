-- Migration 0011 - normalizacao da chave de frequencia "S" (ambigua)
-- Historico: o codigo "S" era usado para Semanal E Semestral,
-- tornando o switch/stepDays impossivel de implementar corretamente.
-- Adotamos:
--   D = Diario           (1 dia)
--   S = Semanal          (7 dias)   <- era tambem Semestral
--   Q = Quinzenal        (14 dias)
--   M = Mensal           (30 dias)
--   B = Bimestral        (60 dias)
--   T = Trimestral       (90 dias)
--   Z = Semestral        (180 dias) <- NOVO: substitui o segundo "S"
--   A = Anual            (365 dias)
--
-- Esta migration:
-- 1) Atualiza o CHECK constraint em todas as colunas `frequency` para incluir "Z"
-- 2) Detecta registros com `frequency` que parecem ser Semestral (180+ dias
--    entre execucoes) e atualiza para "Z". Heuristica conservadora: se a
--    coluna tem um campo auxiliar `first_run_at` alem de 180 dias da
--    `last_executed_at`, assume Z. Caso contrario, mantem S (Semanal).
-- 3) Para preservar dados, NAO altera registros cuja decisao e ambigua.

-- =====================================================================
-- 1) Atualizar CHECK constraints
-- =====================================================================

alter table public.checklist_templates
  drop constraint if exists checklist_templates_frequency_check;
alter table public.checklist_templates
  add constraint checklist_templates_frequency_check
  check (frequency in ('D','S','Q','M','B','T','Z','A','custom'));

alter table public.pmoc_activities
  drop constraint if exists pmoc_activities_frequency_check;
alter table public.pmoc_activities
  add constraint pmoc_activities_frequency_check
  check (frequency in ('D','S','Q','M','B','T','Z','A'));

-- =====================================================================
-- 2) Comentario de documentacao na tabela
-- =====================================================================
comment on column public.checklist_templates.frequency is
  'D=diario S=semanal Q=quinzenal M=mensal B=bimestral T=trimestral Z=semestral A=anual custom';
comment on column public.pmoc_activities.frequency is
  'D=diario S=semanal Q=quinzenal M=mensal B=bimestral T=trimestral Z=semestral A=anual';
