-- MERISHOP FLOW: esquema inicial
create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  location text,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  product text not null,
  cost numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  commission_percent numeric(6,2) default 20,
  shipping numeric(12,2) default 0,
  total numeric(12,2) default 0,
  paid numeric(12,2) default 0,
  status text default 'Nuevo',
  created_at timestamptz default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text,
  product text not null,
  quantity integer default 1,
  status text default 'Disponible',
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric(12,2) not null,
  method text,
  created_at timestamptz default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  carrier text,
  tracking text,
  status text default 'Preparando',
  created_at timestamptz default now()
);

alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.inventory enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;

create policy "clients_owner" on public.clients for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "orders_owner" on public.orders for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "inventory_owner" on public.inventory for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "payments_owner" on public.payments for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "shipments_owner" on public.shipments for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
