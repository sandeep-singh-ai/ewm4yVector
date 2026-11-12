-- Enable pgvector
create extension if not exists vector with schema extensions;

-- Question / answer knowledge base.
-- Embedding dimension 384 matches Xenova/paraphrase-multilingual-MiniLM-L12-v2 (see lib/embed.ts).
create table if not exists public.qa_pairs (
  id          bigint generated always as identity primary key,
  question    text not null unique,
  answer      text not null,
  category    text,
  language    text not null default 'en',
  embedding   extensions.vector(384) not null,
  created_at  timestamptz not null default now()
);

create index if not exists qa_pairs_embedding_idx
  on public.qa_pairs using hnsw (embedding extensions.vector_cosine_ops);

-- Lock the table down: only the server (service role key) reads/writes it.
alter table public.qa_pairs enable row level security;

-- Similarity search. Returns closest pairs above the threshold (cosine similarity 0..1).
create or replace function public.match_qa_pairs(
  query_embedding extensions.vector(384),
  match_threshold float default 0.5,
  match_count int default 4
)
returns table (id bigint, question text, answer text, category text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select q.id, q.question, q.answer, q.category,
         1 - (q.embedding <=> query_embedding) as similarity
  from public.qa_pairs q
  where 1 - (q.embedding <=> query_embedding) >= match_threshold
  order by q.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_qa_pairs from anon, authenticated;
