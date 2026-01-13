-- Create Collections Table
create table public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Bookmarks Table
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text,
  url text,
  description text,
  notes text,
  content text,
  notes_blocks jsonb,
  tags text[],
  pinned boolean default false,
  type text,
  category text,
  sub_category text,
  collection_id uuid references public.collections(id) on delete set null,
  cover_image text,
  thumbnail text,
  metadata jsonb,
  archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Automatically update updated_at on changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_collections_updated_at
before update on public.collections
for each row execute procedure public.handle_updated_at();

create trigger set_bookmarks_updated_at
before update on public.bookmarks
for each row execute procedure public.handle_updated_at();

-- Enable Row Level Security (RLS)
alter table public.collections enable row level security;
alter table public.bookmarks enable row level security;

-- Create Policies
create policy "Users can view their own collections"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own collections"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own collections"
  on public.collections for update
  using (auth.uid() = user_id);

create policy "Users can delete their own collections"
  on public.collections for delete
  using (auth.uid() = user_id);

create policy "Users can view their own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookmarks"
  on public.bookmarks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- Create Indexes
create index bookmarks_user_id_idx on public.bookmarks(user_id);
create index collections_user_id_idx on public.collections(user_id);
create index bookmarks_collection_id_idx on public.bookmarks(collection_id);
