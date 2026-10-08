-- Server-checked PIN for the QR scan page.
-- Run once in Supabase → SQL Editor, after security.sql.
--
-- With a PIN set, scanning shows only the emergency basics (name, blood type,
-- allergies, emergency contact). Conditions, medications, procedures and
-- insurance need the PIN. The PIN is stored bcrypt-hashed, and 5 wrong tries
-- lock the card for 15 minutes.

create extension if not exists pgcrypto with schema extensions;

alter table public.health_profiles
  add column if not exists pin_hash text,
  add column if not exists pin_failed_attempts int not null default 0,
  add column if not exists pin_locked_until timestamptz;

-- Owner sets (4 digits) or clears (null) their PIN ----------------------------
create or replace function public.set_profile_pin(pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := auth.jwt()->>'sub';
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if pin is not null and pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;

  update public.health_profiles
     set pin_hash = case when pin is null then null
                         else extensions.crypt(pin, extensions.gen_salt('bf')) end,
         pin_failed_attempts = 0,
         pin_locked_until = null
   where user_id = uid;

  if not found then
    raise exception 'Save your profile first';
  end if;
end;
$$;

revoke all on function public.set_profile_pin(text) from public;
grant execute on function public.set_profile_pin(text) to authenticated;

-- Scan lookup, now PIN-aware (replaces the 1-argument version) ---------------
drop function if exists public.get_profile_by_token(text);

create or replace function public.get_profile_by_token(token text, pin text default null)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.health_profiles%rowtype;
  unlocked boolean;
  pin_error text;
  failures int;
  result jsonb;
begin
  select * into p from public.health_profiles where qr_token::text = token;
  if not found then
    return null;
  end if;

  unlocked := p.pin_hash is null;

  if not unlocked and pin is not null then
    if p.pin_locked_until > now() then
      pin_error := 'locked';
    elsif extensions.crypt(pin, p.pin_hash) = p.pin_hash then
      unlocked := true;
      update public.health_profiles
         set pin_failed_attempts = 0, pin_locked_until = null
       where user_id = p.user_id;
    else
      failures := p.pin_failed_attempts + 1;
      pin_error := case when failures >= 5 then 'locked' else 'wrong' end;
      update public.health_profiles
         set pin_failed_attempts = case when failures >= 5 then 0 else failures end,
             pin_locked_until = case when failures >= 5 then now() + interval '15 minutes' end
       where user_id = p.user_id;
    end if;
  end if;

  -- Always visible: what a first responder needs immediately
  result := jsonb_build_object(
    'first_name',      p.first_name,
    'last_name',       p.last_name,
    'blood_type',      p.blood_type,
    'allergies',       p.allergies,
    'emergency_name',  p.emergency_name,
    'emergency_phone', p.emergency_phone,
    'emergency_email', p.emergency_email,
    'updated_at',      p.updated_at,
    'pin_protected',   p.pin_hash is not null,
    'locked',          not unlocked,
    'pin_error',       pin_error
  );

  if unlocked then
    result := result || jsonb_build_object(
      'conditions',         p.conditions,
      'medications',        p.medications,
      'past_procedures',    p.past_procedures,
      'insurance_provider', p.insurance_provider,
      'insurance_policy',   p.insurance_policy
    );
  end if;

  return result::json;
end;
$$;

revoke all on function public.get_profile_by_token(text, text) from public;
grant execute on function public.get_profile_by_token(text, text) to anon, authenticated;
