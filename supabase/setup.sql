-- Pawnstorm cloud sync: run this once in your Supabase project's SQL Editor.
-- Safe to run again; it only creates or replaces Pawnstorm's own objects.
--
-- How it works: the browser signs in with lichess (OAuth, no permissions asked) and sends that
-- sign-in token with every sync call. pawnstorm_owner() checks it with lichess once a day and
-- remembers only a SHA-256 hash of it. The tables have row-level security on and no policies,
-- so the public key cannot read or write them directly: everything goes through the functions
-- below, which only ever touch the rows of the lichess account that signed in.

create extension if not exists http with schema extensions;

create table if not exists public.pawnstorm_data (
  owner text not null,          -- lichess user id (lower case)
  k text not null,              -- browser storage key
  v text,                       -- stored value (JSON text)
  ts bigint not null,           -- when the value was changed on the device (ms), newest wins
  seq bigint not null,          -- server write order, so devices can ask for "what changed since"
  primary key (owner, k)
);
create index if not exists pawnstorm_data_seq on public.pawnstorm_data (owner, seq);

create table if not exists public.pawnstorm_sessions (
  token_hash text primary key,
  owner text not null,
  checked_at timestamptz not null default now()
);

create sequence if not exists public.pawnstorm_seq;

alter table public.pawnstorm_data enable row level security;
alter table public.pawnstorm_sessions enable row level security;
revoke all on public.pawnstorm_data, public.pawnstorm_sessions from anon, authenticated;
revoke all on sequence public.pawnstorm_seq from anon, authenticated;

-- Who is this token? Asks lichess at most once a day per token.
create or replace function public.pawnstorm_owner(tok text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  h text;
  who text;
  res record;
begin
  if tok is null or length(tok) < 10 or length(tok) > 300 then
    raise exception 'Sign in with lichess again' using errcode = '28000';
  end if;
  h := encode(sha256(convert_to(tok, 'UTF8')), 'hex');
  select s.owner into who from public.pawnstorm_sessions s
    where s.token_hash = h and s.checked_at > now() - interval '1 day';
  if who is not null then return who; end if;

  select r.status, r.content into res from extensions.http((
    'GET', 'https://lichess.org/api/account',
    array[extensions.http_header('Authorization', 'Bearer ' || tok)],
    null, null)::extensions.http_request) r;
  if res.status is distinct from 200 then
    delete from public.pawnstorm_sessions s where s.token_hash = h;
    raise exception 'Sign in with lichess again' using errcode = '28000';
  end if;
  who := lower(res.content::jsonb ->> 'id');
  if who is null or who = '' then
    raise exception 'Sign in with lichess again' using errcode = '28000';
  end if;
  insert into public.pawnstorm_sessions as s (token_hash, owner, checked_at) values (h, who, now())
    on conflict (token_hash) do update set owner = excluded.owner, checked_at = now();
  return who;
end $$;

create or replace function public.pawnstorm_whoami(tok text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  return public.pawnstorm_owner(tok);
end $$;

-- Everything that changed after `since` (a seq from an earlier pull; 0 = everything).
create or replace function public.pawnstorm_pull(tok text, since bigint default 0)
returns table (key text, val text, changed bigint, pos bigint)
language plpgsql security definer set search_path = '' as $$
declare
  who text := public.pawnstorm_owner(tok);
begin
  return query
    select d.k, d.v, d.ts, d.seq from public.pawnstorm_data d
    where d.owner = who and d.seq > since
    order by d.seq;
end $$;

-- rows: [{"k": key, "v": value or null, "ts": ms}]. An incoming row is ignored when
-- the stored value was changed later on another device.
create or replace function public.pawnstorm_push(tok text, rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  who text := public.pawnstorm_owner(tok);
  r jsonb;
  n integer;
begin
  if jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows) > 200 then
    raise exception 'Send at most 200 rows at a time' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(rows) loop
    if coalesce(length(r ->> 'k'), 0) not between 1 and 200 or coalesce(length(r ->> 'v'), 0) > 8000000 then
      raise exception 'Row too large' using errcode = '22023';
    end if;
    insert into public.pawnstorm_data as d (owner, k, v, ts, seq)
      values (who, r ->> 'k', r ->> 'v', (r ->> 'ts')::bigint, nextval('public.pawnstorm_seq'))
      on conflict (owner, k) do update set v = excluded.v, ts = excluded.ts, seq = excluded.seq
      where d.ts < excluded.ts;
  end loop;
  select count(*) into n from public.pawnstorm_data d where d.owner = who;
  if n > 5000 then
    raise exception 'Too many saved items' using errcode = '22023';
  end if;
  return n;
end $$;

-- Forget this device's sign-in on the server.
create or replace function public.pawnstorm_signout(tok text) returns void
language sql security definer set search_path = '' as $$
  delete from public.pawnstorm_sessions s where s.token_hash = encode(sha256(convert_to(tok, 'UTF8')), 'hex');
$$;

-- Delete everything this account has stored in the cloud.
create or replace function public.pawnstorm_delete_all(tok text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  who text := public.pawnstorm_owner(tok);
begin
  delete from public.pawnstorm_data d where d.owner = who;
  delete from public.pawnstorm_sessions s where s.owner = who;
end $$;

revoke all on function public.pawnstorm_owner(text) from public, anon, authenticated;
revoke all on function public.pawnstorm_whoami(text), public.pawnstorm_pull(text, bigint),
  public.pawnstorm_push(text, jsonb), public.pawnstorm_signout(text), public.pawnstorm_delete_all(text) from public;
grant execute on function public.pawnstorm_whoami(text), public.pawnstorm_pull(text, bigint),
  public.pawnstorm_push(text, jsonb), public.pawnstorm_signout(text), public.pawnstorm_delete_all(text) to anon, authenticated;

notify pgrst, 'reload schema';
