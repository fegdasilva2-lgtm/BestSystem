-- Migration 0004 - Storage buckets e politicas
-- Buckets versionados para fotos, RGM e documentos contratuais.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence', 'evidence', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  ('rgm',      'rgm',      false, 20971520, array['application/pdf']),
  ('contracts','contracts', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Politica: cada tenant sobe e baixa apenas arquivos do proprio path.
-- Estrutura de path: {tenant_id}/{entity_id}/{filename}
--
-- Validacao defensiva:
-- - tenant_id atual precisa existir
-- - path precisa ter primeiro segmento
-- - primeiro segmento precisa ser UUID valido
-- - primeiro segmento precisa bater exatamente com current_tenant_id()
create or replace function public.storage_tenant_path_match(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    public.current_tenant_id() is not null
    and (storage.foldername(object_name))[1] is not null
    and (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and lower((storage.foldername(object_name))[1]) = lower(public.current_tenant_id()::text);
$$;

create policy "evidence read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.storage_tenant_path_match(name));

create policy "evidence insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.storage_tenant_path_match(name));

create policy "rgm read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'rgm' and public.storage_tenant_path_match(name));

create policy "rgm insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rgm' and public.storage_tenant_path_match(name));

create policy "contracts read tenant" on storage.objects
  for select to authenticated
  using (bucket_id = 'contracts' and public.storage_tenant_path_match(name));

create policy "contracts insert tenant" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contracts' and public.storage_tenant_path_match(name));
