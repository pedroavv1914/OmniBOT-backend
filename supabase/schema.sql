create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text,
  username text,
  created_at timestamptz default now()
);

create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  description text,
  is_active boolean default true,
  phone_number text
);

create table if not exists bot_flows (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null,
  flow_json jsonb not null,
  created_at timestamptz default now(),
  status text not null default 'draft' check (status in ('draft','published'))
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null,
  channel text not null,
  contact_identifier text not null,
  status text not null default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_type text not null check (sender_type in ('user','bot','agent')),
  direction text not null check (direction in ('incoming','outgoing')),
  channel text not null,
  content text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists ai_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null,
  message_input text not null,
  ai_response text not null,
  tokens integer default 0,
  created_at timestamptz default now()
);


create table if not exists ai_logs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null,
  message_input text not null,
  ai_response text not null,
  tokens integer default 0,
  created_at timestamptz default now()
);

create table if not exists conversation_states (
  conversation_id uuid primary key,
  bot_id uuid,
  variables jsonb not null default '{}'::jsonb,
  awaiting_var text,
  awaiting_node_id text
);


alter table users enable row level security;
alter table bots enable row level security;
alter table bot_flows enable row level security;
alter table numbers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_logs enable row level security;
alter table conversation_states enable row level security;

create policy select_users on users for select using (
  auth_user_id = auth.uid()
);

create policy select_bots on bots for select using (
  owner_id = auth.uid()
);

create policy select_bot_flows on bot_flows for select using (
  exists (
    select 1 from bots b
    where b.id = bot_flows.bot_id and b.owner_id = auth.uid()
  )
);

create policy select_conversations on conversations for select using (
  exists (
    select 1 from bots b
    where b.id = conversations.bot_id and b.owner_id = auth.uid()
  )
);

create policy select_messages on messages for select using (
  exists (
    select 1 from conversations c
    join bots b on b.id = c.bot_id
    where c.id = messages.conversation_id and b.owner_id = auth.uid()
  )
);

create policy select_ai_logs on ai_logs for select using (
  exists (
    select 1 from bots b
    where b.id = ai_logs.bot_id and b.owner_id = auth.uid()
  )
);

create policy select_conv_states on conversation_states for select using (
  exists (
    select 1 from conversations c
    join bots b on b.id = c.bot_id
    where c.id = conversation_states.conversation_id and b.owner_id = auth.uid()
  )
);
create table if not exists numbers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  phone_number text not null unique,
  bot_id uuid,
  created_at timestamptz default now()
);
create policy select_numbers on numbers for select using (
  owner_id = auth.uid()
);
