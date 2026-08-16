-- HeartLeak: basic database-side anti-spam limits
-- Run once in Supabase SQL Editor. This does not delete or modify existing data.

create or replace function public.enforce_heartleak_rate_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'posts' then
    if exists (
      select 1 from public.posts
      where author_id = new.author_id
        and created_at > now() - interval '30 seconds'
    ) then
      raise exception 'Please wait 30 seconds before sharing another post.';
    end if;
  elsif tg_table_name = 'messages' then
    if exists (
      select 1 from public.messages
      where sender_id = new.sender_id
        and created_at > now() - interval '2 seconds'
    ) then
      raise exception 'Please wait a moment before sending another message.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists heartleak_post_rate_limit on public.posts;
create trigger heartleak_post_rate_limit
before insert on public.posts
for each row execute function public.enforce_heartleak_rate_limits();

drop trigger if exists heartleak_message_rate_limit on public.messages;
create trigger heartleak_message_rate_limit
before insert on public.messages
for each row execute function public.enforce_heartleak_rate_limits();

-- Send conversation changes to connected browsers immediately. This is safe
-- to rerun and does not alter any existing conversations or messages.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'connections'
  ) then
    alter publication supabase_realtime add table public.connections;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
