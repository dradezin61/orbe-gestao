-- Estrutura do Orbe Gestão: perfis, produtos, pedidos e itens do pedido.

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  summary text not null,
  description text not null,
  category text not null,
  -- Preço em centavos: dinheiro nunca em ponto flutuante.
  price_cents int not null check (price_cents > 0),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_idx on public.products (active, category);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- aguardando: criado antes do pagamento; pago: confirmado pela Stripe;
  -- enviado: despachado pela loja; cancelado: pagamento não concluído.
  status text not null default 'aguardando'
    check (status in ('aguardando', 'pago', 'enviado', 'cancelado')),
  total_cents int not null check (total_cents > 0),
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz
);

create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  -- Nome e preço copiados na compra: mudar o catálogo depois não reescreve o pedido.
  product_name text not null,
  unit_price_cents int not null check (unit_price_cents > 0),
  quantity int not null check (quantity > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- Perfil criado junto com a conta, sempre como cliente. Admin se concede fora
-- do cadastro (`npm run db:admin -- <e-mail>`).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Só leitura pelas políticas; toda escrita passa pelas funções da 0002.
create policy "perfil próprio ou administração"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "catálogo é público"
  on public.products for select to anon, authenticated
  using (active or public.is_admin());

create policy "pedidos próprios ou administração"
  on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "itens dos pedidos próprios ou administração"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );
