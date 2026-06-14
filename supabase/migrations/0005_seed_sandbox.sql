-- Migration 0005 - Seed sandbox: 3 tenants ficticios para UAT
-- Os dados abaixo NAO vao para producao. Apos o piloto, este arquivo
-- e substituido por um wizard de onboarding assistido.

-- Senha de todos os usuarios seed: 'PredialOps!2026' (forcar troca no 1o login)

insert into public.tenants (id, name, slug, plan, status) values
  ('00000000-0000-0000-0000-000000000001', 'IMC Facilities',  'imc-facilities',  'business',    'ativo'),
  ('00000000-0000-0000-0000-000000000002', 'Rede Vitta',      'rede-vitta',      'professional','implantacao'),
  ('00000000-0000-0000-0000-000000000003', 'Condominio Axis', 'condominio-axis', 'starter',     'piloto')
on conflict do nothing;
