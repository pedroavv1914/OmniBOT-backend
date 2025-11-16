create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null
);

create table if not exists workspace_members (
  workspace_id uuid not null,
  user_id uuid not null,
  role text not null,
  primary key (workspace_id, user_id)
);

create table if not exists bots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  description text,
  is_active boolean default true
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

create table if not exists conversation_states (
  conversation_id uuid primary key,
  bot_id uuid,
  variables jsonb not null default '{}'::jsonb,
  awaiting_var text,
  awaiting_node_id text
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  limits jsonb not null
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  plan_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz
);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table bots enable row level security;
alter table bot_flows enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_logs enable row level security;
alter table conversation_states enable row level security;
alter table subscriptions enable row level security;

create policy select_workspace on workspaces for select using (
  exists (select 1 from workspace_members wm where wm.workspace_id = workspaces.id and wm.user_id = auth.uid())
);

create policy select_workspace_members on workspace_members for select using (
  user_id = auth.uid()
);

create policy select_bots on bots for select using (
  exists (select 1 from workspace_members wm where wm.workspace_id = bots.workspace_id and wm.user_id = auth.uid())
);

create policy select_bot_flows on bot_flows for select using (
  exists (
    select 1 from bots b
    join workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = bot_flows.bot_id and wm.user_id = auth.uid()
  )
);

create policy select_conversations on conversations for select using (
  exists (
    select 1 from bots b
    join workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = conversations.bot_id and wm.user_id = auth.uid()
  )
);

create policy select_messages on messages for select using (
  exists (
    select 1 from conversations c
    join bots b on b.id = c.bot_id
    join workspace_members wm on wm.workspace_id = b.workspace_id
    where c.id = messages.conversation_id and wm.user_id = auth.uid()
  )
);

create policy select_ai_logs on ai_logs for select using (
  exists (
    select 1 from bots b
    join workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = ai_logs.bot_id and wm.user_id = auth.uid()
  )
);

create policy select_conv_states on conversation_states for select using (
  exists (
    select 1 from conversations c
    join bots b on b.id = c.bot_id
    join workspace_members wm on wm.workspace_id = b.workspace_id
    where c.id = conversation_states.conversation_id and wm.user_id = auth.uid()
  )
);

create policy select_subscriptions on subscriptions for select using (
  exists (
    select 1 from workspace_members wm where wm.workspace_id = subscriptions.workspace_id and wm.user_id = auth.uid()
  )
);