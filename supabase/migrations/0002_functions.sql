-- Regras de negócio do Orbe. Ficam no banco, não na interface: o preço e o
-- estoque nunca vêm do navegador, e duas compras simultâneas da última unidade
-- não passam juntas.

-- Minutos que um pedido fica com o estoque reservado esperando pagamento.
create function public.reservation_minutes()
returns int language sql immutable set search_path = '' as $$ select 30 $$;

/**
 * Cria o pedido a partir de [{"product_id": uuid, "quantity": int}].
 * Trava cada produto, confere disponibilidade, calcula o total com o preço do
 * banco e reserva o estoque. O pedido nasce "aguardando": só vira "pago" pelo
 * aviso da Stripe.
 */
create function public.create_order(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_total int := 0;
  v_item record;
  v_product record;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  insert into public.orders (user_id, total_cents, status)
  values (v_user, 1, 'aguardando')
  returning id into v_order;

  for v_item in
    select (value ->> 'product_id')::uuid as product_id,
           (value ->> 'quantity')::int as quantity
      from jsonb_array_elements(p_items)
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_product
      from public.products
     where id = v_item.product_id
       for update;

    if not found or not v_product.active then raise exception 'product_unavailable'; end if;
    if v_product.stock < v_item.quantity then raise exception 'out_of_stock'; end if;

    update public.products
       set stock = stock - v_item.quantity, updated_at = now()
     where id = v_product.id;

    insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
    values (v_order, v_product.id, v_product.name, v_product.price_cents, v_item.quantity);

    v_total := v_total + v_product.price_cents * v_item.quantity;
  end loop;

  update public.orders set total_cents = v_total where id = v_order;
  return v_order;
end;
$$;

/** Guarda a sessão de pagamento no pedido, para o aviso da Stripe encontrá-lo. */
create function public.attach_checkout_session(p_order uuid, p_session text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
     set stripe_session_id = p_session
   where id = p_order and user_id = auth.uid() and status = 'aguardando';
  if not found then raise exception 'order_not_found'; end if;
end;
$$;

/**
 * Confirma o pagamento. Chamada apenas pelo servidor, ao receber o aviso
 * assinado da Stripe. Repetir a chamada não duplica nada: se o pedido já estava
 * pago, não faz efeito — a Stripe reenvia avisos.
 */
create function public.confirm_paid_order(p_session text, p_payment_intent text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where stripe_session_id = p_session for update;
  if not found then return null; end if;
  if v_order.status <> 'aguardando' then return v_order.id; end if;

  update public.orders
     set status = 'pago', paid_at = now(), stripe_payment_intent = p_payment_intent
   where id = v_order.id;
  return v_order.id;
end;
$$;

/** Cancela um pedido não pago e devolve o estoque reservado. */
create function public.cancel_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.user_id <> auth.uid() and not public.is_admin() then raise exception 'forbidden'; end if;
  if v_order.status <> 'aguardando' then raise exception 'order_not_cancellable'; end if;

  for v_item in select product_id, quantity from public.order_items where order_id = v_order.id loop
    update public.products
       set stock = stock + v_item.quantity, updated_at = now()
     where id = v_item.product_id;
  end loop;

  update public.orders set status = 'cancelado' where id = v_order.id;
end;
$$;

/**
 * Devolve ao estoque o que ficou reservado por pedidos que nunca foram pagos.
 * Chamada ao abrir o catálogo, como uma limpeza barata e previsível.
 */
create function public.release_expired_orders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_item record;
  v_count int := 0;
begin
  for v_order in
    select id from public.orders
     where status = 'aguardando'
       and created_at < now() - (public.reservation_minutes() || ' minutes')::interval
     for update skip locked
  loop
    for v_item in select product_id, quantity from public.order_items where order_id = v_order.id loop
      update public.products
         set stock = stock + v_item.quantity, updated_at = now()
       where id = v_item.product_id;
    end loop;
    update public.orders set status = 'cancelado' where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- --- Administração ---------------------------------------------------------

create function public.save_product(
  p_id uuid, p_name text, p_summary text, p_description text,
  p_category text, p_price_cents int, p_stock int, p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_price_cents is null or p_price_cents <= 0 then raise exception 'invalid_price'; end if;
  if p_stock is null or p_stock < 0 then raise exception 'invalid_stock'; end if;

  if p_id is null then
    v_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
    if exists (select 1 from public.products where slug = v_slug) then
      v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    end if;
    insert into public.products (slug, name, summary, description, category, price_cents, stock, active)
    values (v_slug, p_name, p_summary, p_description, p_category, p_price_cents, p_stock, p_active)
    returning id into v_id;
  else
    update public.products
       set name = p_name, summary = p_summary, description = p_description, category = p_category,
           price_cents = p_price_cents, stock = p_stock, active = p_active, updated_at = now()
     where id = p_id
     returning id into v_id;
    if v_id is null then raise exception 'product_not_found'; end if;
  end if;

  return v_id;
end;
$$;

/** Marca um pedido pago como enviado. */
create function public.mark_order_shipped(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.orders set status = 'enviado', shipped_at = now()
   where id = p_order and status = 'pago';
  if not found then raise exception 'order_not_payable'; end if;
end;
$$;

revoke all on function public.create_order(jsonb) from public, anon;
revoke all on function public.attach_checkout_session(uuid, text) from public, anon;
revoke all on function public.confirm_paid_order(text, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon;
revoke all on function public.save_product(uuid, text, text, text, text, int, int, boolean) from public, anon;
revoke all on function public.mark_order_shipped(uuid) from public, anon;

grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.attach_checkout_session(uuid, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.save_product(uuid, text, text, text, text, int, int, boolean) to authenticated;
grant execute on function public.mark_order_shipped(uuid) to authenticated;
grant execute on function public.release_expired_orders() to anon, authenticated;
-- confirm_paid_order fica só para a chave secreta do servidor (service_role).
grant execute on function public.confirm_paid_order(text, text) to service_role;
