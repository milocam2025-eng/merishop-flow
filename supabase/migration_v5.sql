-- MeriShop Flow Pro v5
-- Ejecuta este archivo en Supabase SQL Editor UNA SOLA VEZ.

alter table public.clients
  add column if not exists notes text;

alter table public.inventory
  add column if not exists brand text,
  add column if not exists category text;

-- Índices simples para búsquedas futuras
create index if not exists clients_name_idx on public.clients (name);
create index if not exists inventory_product_idx on public.inventory (product);
create index if not exists orders_created_at_idx on public.orders (created_at);
