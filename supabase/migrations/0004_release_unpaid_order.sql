-- Cancelamento de um pedido não pago feito pelo próprio servidor, sem sessão de
-- usuário: usado quando a Stripe não devolve uma sessão de pagamento e o
-- estoque reservado precisa voltar na hora, em vez de esperar a expiração.
create function public.release_unpaid_order(p_order uuid)
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
  if not found or v_order.status <> 'aguardando' then return; end if;

  for v_item in select product_id, quantity from public.order_items where order_id = v_order.id loop
    update public.products
       set stock = stock + v_item.quantity, updated_at = now()
     where id = v_item.product_id;
  end loop;

  update public.orders set status = 'cancelado' where id = v_order.id;
end;
$$;

revoke all on function public.release_unpaid_order(uuid) from public, anon, authenticated;
grant execute on function public.release_unpaid_order(uuid) to service_role;
