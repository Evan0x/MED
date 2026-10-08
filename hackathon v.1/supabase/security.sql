-- Lock down health_profiles.
-- Run once in Supabase → SQL Editor, AFTER connecting Clerk as a third-party
-- auth provider (Authentication → Sign In / Providers → Third-Party Auth).
--
-- Result:
--   • Signed-in users can read/write ONLY their own row (matched on Clerk user id).
--   • The public key can no longer list or read the table at all.
--   • QR scans read a single profile through get_profile_by_token(), using a
--     random, unguessable token that the owner can reset.

-- 1. Secret QR token per profile ---------------------------------------------
alter table public.health_profiles
  add column if not exists qr_token uuid not null default gen_random_uuid();

create unique index if not exists health_profiles_qr_token_key
  on public.health_profiles (qr_token);

-- 2. Owner-only access --------------------------------------------------------
alter table public.health_profiles enable row level security;

-- Remove every existing policy (including any "public read" ones)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'health_profiles'
  loop
    execute format('drop policy %I on public.health_profiles', p.policyname);
  end loop;
end $$;

-- auth.jwt()->>'sub' is the Clerk user id (e.g. user_3CYh9...)
create policy "owner can read" on public.health_profiles
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "owner can insert" on public.health_profiles
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "owner can update" on public.health_profiles
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "owner can delete" on public.health_profiles
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

-- 3. Public lookup of ONE profile by its QR token ----------------------------
-- Returns only the fields the scan page shows; null if the token is unknown.
create or replace function public.get_profile_by_token(token text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'first_name',         first_name,
    'last_name',          last_name,
    'blood_type',         blood_type,
    'allergies',          allergies,
    'conditions',         conditions,
    'medications',        medications,
    'past_procedures',    past_procedures,
    'emergency_name',     emergency_name,
    'emergency_phone',    emergency_phone,
    'emergency_email',    emergency_email,
    'insurance_provider', insurance_provider,
    'insurance_policy',   insurance_policy,
    'updated_at',         updated_at
  )
  from public.health_profiles
  where qr_token::text = token
  limit 1;
$$;

revoke all on function public.get_profile_by_token(text) from public;
grant execute on function public.get_profile_by_token(text) to anon, authenticated;
