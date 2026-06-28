-- ①ネタ管理: 木材用語マスタ（README §3.1）
-- 間借り先と衝突しないよう termcast_wood_ プレフィックス。
create table if not exists termcast_wood_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  reading text not null default '',
  category text not null default '',
  difficulty int not null default 1 check (difficulty between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'generated', 'published')),
  published_at timestamptz,
  youtube_video_id text,
  tiktok_draft_id text,
  drive_link text,
  created_at timestamptz not null default now()
);

create index if not exists termcast_wood_terms_status_idx on termcast_wood_terms (status);
create index if not exists termcast_wood_terms_pick_idx on termcast_wood_terms (status, difficulty);

-- 木材版で新規: 実写素材アセット管理（README §3.5.1）
-- 用語と素材ファイルを紐づける。file は assets/ 配下（および任意で Supabase Storage）のファイル名。
-- レンダリングはローカルの assets/ を参照するため、Storage 運用でも実体は assets/ に同期しておくこと。
create table if not exists termcast_wood_assets (
  id uuid primary key default gen_random_uuid(),
  term text not null references termcast_wood_terms (term) on update cascade on delete cascade,
  file text not null,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (term, file)
);

create index if not exists termcast_wood_assets_term_idx on termcast_wood_assets (term, sort);
