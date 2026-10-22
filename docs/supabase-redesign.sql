-- Run once in the owner's Supabase SQL editor BEFORE deploying the redesign.
-- Additive: existing public.products and image objects remain unchanged.
-- Private state contains opt-in contact details; NEVER grant anon/authenticated access.
create table if not exists public.boleta_state (
  id text primary key check (id = 'catalog'),
  document jsonb not null check (jsonb_typeof(document) = 'object')
);
alter table public.boleta_state enable row level security;
revoke all on public.boleta_state from anon, authenticated;
grant select, insert, update on public.boleta_state to service_role;
insert into public.boleta_state(id, document)
values ('catalog', '{"revision":0}'::jsonb) on conflict (id) do nothing;

create or replace function public.boleta_state_compare_swap(
  expected_revision bigint, next_document jsonb
) returns boolean
language plpgsql security invoker set search_path = public as $$
declare changed integer;
begin
  if (next_document->>'revision')::bigint <> expected_revision + 1 then
    raise exception 'Invalid next revision';
  end if;
  update public.boleta_state set document = next_document
  where id = 'catalog' and (document->>'revision')::bigint = expected_revision;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.boleta_state_compare_swap(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.boleta_state_compare_swap(bigint,jsonb) to service_role;

-- product-images must exist and be public for storefront images. Only the backend
-- service_role may upload; keep anonymous storage INSERT/UPDATE/DELETE policies off.
-- Production env: ADMIN_PASSWORD (>=12 chars), SUPABASE_URL, service-role key,
-- BOLETA_ENV=production, BOLETA_PUBLIC_ORIGIN=https://your-actual-render-host.
-- ADMIN_PIN is accepted only as a >=12-character secret, never a short numeric PIN.
-- Use one uvicorn worker for in-memory admin sessions/rate limits. PostgreSQL CAS
-- prevents lost state updates across writers; on HTTP 409 reload and retry.
-- Sessions expire after 8h and after process restarts (intentional re-login).
-- DO NOT set BOLETA_ALLOW_LOCAL_STORAGE=1 on an ephemeral Render filesystem.
-- Local preview only: BOLETA_ENV=development BOLETA_ALLOW_LOCAL_STORAGE=1
-- BOLETA_DATA_DIR=<outside-tracked-data> BOLETA_CATALOG_SOURCE=<approved-backup.json>.
-- /api/health is liveness, not a claim that DB is reachable. Snapshot response reads
-- carry X-Boleta-Data-Status:snapshot. Writes return 503/409; never local success.
-- Contact leads remain private to admin export, with consent version/time. Avoid
-- unnecessary retention: export only for the accepted purpose; honor deletion requests.
-- 2026-10-22: rewards were retired. POST /api/rewards/spin returns 410 without
-- changing state. Previous spins/claims/configuration remain private historical
-- records; no migration or destructive data cleanup is required. Existing settings
-- adopt studio.logo=/images/digital-solution-logo.webp without replacing other fields.
