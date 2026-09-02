-- DearStrangers: keyword matching on the anonymous profile
-- Run this ONCE in Supabase SQL Editor. It does not delete existing data.
--
-- Up to 10 keywords per profile (e.g. college name, hobbies). Stored
-- lowercase/trimmed by the client so matching is case-insensitive without
-- needing a case-folding function on every read. Lives on the existing
-- public "profiles" table (not private_profiles) because other accounts
-- must be able to read it to compute a match against their own feed —
-- the existing "signed-in users can read public profiles" policy already
-- covers that, so no new RLS policy is needed.

alter table public.profiles
  add column if not exists keywords text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_keywords_max_10;
alter table public.profiles
  add constraint profiles_keywords_max_10
  check (array_length(keywords, 1) is null or array_length(keywords, 1) <= 10);

-- Speeds up "which of my keywords does this author share" lookups as the
-- posts feed grows.
create index if not exists profiles_keywords_gin_idx on public.profiles using gin (keywords);
