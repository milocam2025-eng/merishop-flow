-- MeriShop Flow Pro - Fase 10: registro transaccional de pagos.

begin;

create or replace function public.register_order_payment(
  p_order_id uuid,
  p_amount numeric,
  p_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_total numeric;
  v_paid numeric;
  v_new_paid numeric;
  v_new_status text;
  v_payment_id public.payments.id%type;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar pagos.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if nullif(btrim(coalesce(p_method, '')), '') is null then
    raise exception 'Selecciona un método de pago.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and (user_id = auth.uid() or source = 'tienda')
  for update;

  if not found then
    raise exception 'Pedido no encontrado o sin permiso.';
  end if;

  if v_order.status = 'Cancelado' then
    raise exception 'No se puede registrar un pago en un pedido cancelado.';
  end if;

  v_total := case
    when v_order.source = 'tienda' then coalesce(v_order.total_mxn, v_order.total, 0)
    else coalesce(v_order.total, 0)
  end;
  v_paid := greatest(0, coalesce(v_order.paid, 0));

  if p_amount > v_total - v_paid then
    raise exception 'El pago excede el saldo pendiente.';
  end if;

  v_new_paid := v_paid + p_amount;
  v_new_status := case
    when v_new_paid >= v_total then 'Pagado'
    when v_new_paid > 0 then 'Apartado'
    else coalesce(v_order.status, 'Nuevo')
  end;

  insert into public.payments (user_id, order_id, amount, method)
  values (auth.uid(), v_order.id, p_amount, btrim(p_method))
  returning id into v_payment_id;

  update public.orders
  set paid = v_new_paid,
      status = v_new_status
  where id = v_order.id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'paid', v_new_paid,
    'balance', greatest(0, v_total - v_new_paid),
    'status', v_new_status
  );
end;
$$;

revoke all on function public.register_order_payment(uuid, numeric, text) from public, anon;
grant execute on function public.register_order_payment(uuid, numeric, text) to authenticated;

revoke insert, update, delete on table public.payments from public, anon, authenticated;
grant select on table public.payments to authenticated;

-- El saldo solo se modifica mediante register_order_payment.
revoke update on table public.orders from authenticated;
grant update (status) on table public.orders to authenticated;

commit;
