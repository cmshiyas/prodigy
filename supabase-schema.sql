-- Run this in your Supabase SQL editor

-- Users table
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  google_id text unique not null,
  email text unique not null,
  name text,
  picture text,
  is_admin boolean default false,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  tier text default 'silver' check (tier in ('silver','gold','platinum','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns exist for existing installations
alter table users add column if not exists google_id text unique not null;
alter table users add column if not exists email text unique not null;
alter table users add column if not exists name text;
alter table users add column if not exists picture text;
alter table users add column if not exists is_admin boolean default false;
alter table users add column if not exists status text default 'pending';
alter table users add column if not exists tier text default 'silver';
alter table users add column if not exists created_at timestamptz default now();
alter table users add column if not exists updated_at timestamptz default now();
alter table users add column if not exists referral_code text unique;
alter table users add column if not exists referred_by uuid references users(id) on delete set null;
alter table users add column if not exists promo_expires_at timestamptz;
alter table users add column if not exists stripe_customer_id text unique;
alter table users add column if not exists stripe_subscription_id text unique;
create index if not exists users_referral_code_idx on users(referral_code);

-- Promo codes table
create table if not exists promo_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  tier text not null check (tier in ('gold','platinum')),
  duration_days integer,
  max_uses integer,
  uses_count integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Promo redemptions table
create table if not exists promo_redemptions (
  id uuid default gen_random_uuid() primary key,
  promo_code_id uuid references promo_codes(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  tier_granted text,
  tier_expires_at timestamptz,
  redeemed_at timestamptz default now(),
  unique(promo_code_id, user_id)
);

-- Daily token usage table
create table if not exists token_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  date date not null,
  tokens_used integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Ensure columns exist for existing installations
alter table token_usage add column if not exists user_id uuid references users(id) on delete cascade;
alter table token_usage add column if not exists date date not null;
alter table token_usage add column if not exists tokens_used integer default 0;
alter table token_usage add column if not exists updated_at timestamptz default now();

-- Quiz attempts table
create table if not exists quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  exam_type text not null default 'OC' check (exam_type in ('NAPLAN','OC','Selective')),
  score integer not null,
  total_questions integer not null,
  correct_answers integer not null,
  duration_seconds integer not null,
  topics text[] not null,
  created_at timestamptz default now()
);

-- Ensure columns exist for existing installations
alter table quiz_attempts add column if not exists user_id uuid references users(id) on delete cascade;
alter table quiz_attempts add column if not exists exam_type text not null default 'OC';
alter table quiz_attempts add column if not exists score integer not null;
alter table quiz_attempts add column if not exists total_questions integer not null;
alter table quiz_attempts add column if not exists correct_answers integer not null;
alter table quiz_attempts add column if not exists duration_seconds integer not null;
alter table quiz_attempts add column if not exists topics text[] not null;
alter table quiz_attempts add column if not exists created_at timestamptz default now();

-- Questions table for persistent storage
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  topic_id text not null,
  subtopic text,
  exam_type text not null default 'OC' check (exam_type in ('NAPLAN','OC','Selective')),
  created_by uuid references users(id) on delete set null,
  question text not null,
  visual text,
  options jsonb not null,
  correct integer not null,
  explanation text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now(),
  unique(topic_id, question)
);

-- If questions table already exists, ensure created_by column exists for tracking question creators
alter table questions add column if not exists topic_id text not null;
alter table questions add column if not exists subtopic text;
alter table questions add column if not exists exam_type text not null default 'OC';
alter table questions add column if not exists created_by uuid references users(id) on delete set null;
alter table questions add column if not exists question text not null;
alter table questions add column if not exists visual text;
alter table questions add column if not exists options jsonb not null;
alter table questions add column if not exists correct integer not null;
alter table questions add column if not exists explanation text not null;
alter table questions add column if not exists difficulty text not null check (difficulty in ('easy','medium','hard'));
alter table questions add column if not exists created_at timestamptz default now();
alter table questions add column if not exists year_level text;
create index if not exists questions_year_level_idx on questions(year_level);
alter table questions add column if not exists question_source text check (question_source in ('sample', 'past_paper')) default 'sample';
alter table questions add column if not exists paper_year text;

-- If questions table already exists, ensure created_by column exists for tracking question creators
alter table questions add column if not exists created_by uuid references users(id) on delete set null;

-- Question responses table to track user attempts
create table if not exists question_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  subtopic text,
  selected_option integer not null,
  is_correct boolean not null,
  response_time_seconds integer,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

-- Ensure columns exist for existing installations
alter table question_responses add column if not exists user_id uuid references users(id) on delete cascade;
alter table question_responses add column if not exists question_id uuid references questions(id) on delete cascade;
alter table question_responses add column if not exists subtopic text;
alter table question_responses add column if not exists selected_option integer not null;
alter table question_responses add column if not exists is_correct boolean not null;
alter table question_responses add column if not exists response_time_seconds integer;
alter table question_responses add column if not exists created_at timestamptz default now();

-- Indexes
create index if not exists quiz_attempts_user_id_idx on quiz_attempts(user_id);
create index if not exists quiz_attempts_created_at_idx on quiz_attempts(created_at);
create index if not exists questions_topic_id_idx on questions(topic_id);
create index if not exists questions_difficulty_idx on questions(difficulty);
create index if not exists questions_created_by_idx on questions(created_by);
create index if not exists question_responses_user_id_idx on question_responses(user_id);
create index if not exists question_responses_question_id_idx on question_responses(question_id);

-- Auto-approve and set admin for cmshiyas007@gmail.com
-- (This runs when admin first signs in, but set it here as a safety net)
insert into users (google_id, email, name, is_admin, status, tier)
values ('admin-placeholder', 'cmshiyas007@gmail.com', 'Admin', true, 'approved', 'admin')
on conflict (email) do update set is_admin = true, status = 'approved', tier = 'admin';

-- Question reports table
create table if not exists question_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  reason text not null check (reason in ('missing_image', 'wrong_answer', 'ambiguous_question')),
  actioned_at timestamptz default null,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);
alter table question_reports add column if not exists actioned_at timestamptz default null;
create index if not exists question_reports_question_id_idx on question_reports(question_id);

-- Row Level Security (keep data private)
alter table users enable row level security;
alter table token_usage enable row level security;
alter table quiz_attempts enable row level security;
alter table questions enable row level security;
alter table question_responses enable row level security;

-- Service key bypasses RLS (our API uses service key, so this is fine)
-- These policies allow nothing from the client directly (all access goes through our API)
create policy "No direct client access to users" on users for all using (false);
create policy "No direct client access to token_usage" on token_usage for all using (false);
create policy "No direct client access to quiz_attempts" on quiz_attempts for all using (false);
create policy "No direct client access to questions" on questions for all using (false);
create policy "No direct client access to question_responses" on question_responses for all using (false);
alter table question_reports enable row level security;
create policy "No direct client access to question_reports" on question_reports for all using (false);

-- Practice tests table (named tests with publish/unpublish)
create table if not exists practice_tests (
  id uuid default gen_random_uuid() primary key,
  exam_type text not null check (exam_type in ('NAPLAN','OC','Selective')),
  title text not null,
  paper_year text not null,
  question_source text not null default 'sample' check (question_source in ('sample', 'past_paper')),
  is_published boolean default false,
  created_at timestamptz default now(),
  unique(exam_type, paper_year, question_source)
);
alter table practice_tests enable row level security;
create policy "No direct client access to practice_tests" on practice_tests for all using (false);
create index if not exists practice_tests_exam_type_idx on practice_tests(exam_type);
create index if not exists practice_tests_published_idx on practice_tests(is_published);
