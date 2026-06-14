-- Migration 0004 - Storage buckets e politicas
-- Buckets versionados para fotos, RGM e documentos contratuais.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence', 'evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('rgm',      'rgm',      false, 20971520, array['application/pdf']),
  ('contracts','contracts', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Politica: cada tenant sobe e baixa apenas arquivos do proprio path
-- Estrutura de path: {tenant_id}/{work_order_id}/{filename}

create policy "evidence read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "evidence insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "rgm read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'rgm' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "rgm insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rgm' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "contracts read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "contracts insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] = public.current_tenant_id()::text);
