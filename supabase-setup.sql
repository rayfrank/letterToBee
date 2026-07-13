-- Run once in Supabase Dashboard > SQL Editor for project dlkkxcdwkoqeguemifsz.
-- Also enable Anonymous Sign-Ins under Authentication > Providers > Anonymous.

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.voice_notes
add column if not exists sender_name text not null default 'Someone';

alter table public.voice_notes enable row level security;

drop policy if exists "Signed-in visitors can hear voice notes" on public.voice_notes;
drop policy if exists "Visitors can add their own voice notes" on public.voice_notes;
drop policy if exists "Visitors can delete their own voice notes" on public.voice_notes;

create policy "Signed-in visitors can hear voice notes"
on public.voice_notes for select to authenticated using (true);

create policy "Visitors can add their own voice notes"
on public.voice_notes for insert to authenticated
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes',
  'voice-notes',
  false,
  10485760,
  array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in visitors can hear stored voice notes" on storage.objects;
drop policy if exists "Visitors can upload to their own folder" on storage.objects;
drop policy if exists "Visitors can delete from their own folder" on storage.objects;

create policy "Signed-in visitors can hear stored voice notes"
on storage.objects for select to authenticated
using (bucket_id = 'voice-notes');

create policy "Visitors can upload to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Visitors can delete from their own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create table if not exists public.text_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 1000),
  sender_name text not null check (char_length(sender_name) between 1 and 30),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.text_messages enable row level security;

drop policy if exists "Signed-in visitors can read text messages" on public.text_messages;
drop policy if exists "Visitors can add their own text messages" on public.text_messages;
drop policy if exists "Visitors can delete their own text messages" on public.text_messages;

create policy "Signed-in visitors can read text messages"
on public.text_messages for select to authenticated using (true);

create policy "Visitors can add their own text messages"
on public.text_messages for insert to authenticated
with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voice_notes'
  ) then
    alter publication supabase_realtime add table public.voice_notes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'text_messages'
  ) then
    alter publication supabase_realtime add table public.text_messages;
  end if;
end $$;

-- Make newly added columns available to the REST API immediately.
notify pgrst, 'reload schema';
