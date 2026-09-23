-- save_product passa a gravar também a fotografia. Assinatura nova: a antiga é
-- removida para não ficarem duas versões respondendo pelo mesmo nome.
drop function if exists public.save_product(uuid, text, text, text, text, int, int, boolean);

create function public.save_product(
  p_id uuid, p_name text, p_summary text, p_description text,
  p_category text, p_price_cents int, p_stock int, p_active boolean,
  p_image_path text, p_image_alt text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_image_path text := nullif(trim(p_image_path), '');
  v_image_alt text := nullif(trim(p_image_alt), '');
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_price_cents is null or p_price_cents <= 0 then raise exception 'invalid_price'; end if;
  if p_stock is null or p_stock < 0 then raise exception 'invalid_stock'; end if;
  -- Caminho interno servido pelo próprio app; nada de endereços de terceiros.
  if v_image_path is not null and v_image_path !~ '^/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp|avif)$' then
    raise exception 'invalid_image_path';
  end if;
  if v_image_path is not null and v_image_alt is null then raise exception 'image_alt_required'; end if;

  if p_id is null then
    v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
    if exists (select 1 from public.products where slug = v_slug) then
      v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    end if;
    insert into public.products (slug, name, summary, description, category, price_cents, stock, active, image_path, image_alt)
    values (v_slug, p_name, p_summary, p_description, p_category, p_price_cents, p_stock, p_active, v_image_path, v_image_alt)
    returning id into v_id;
  else
    update public.products
       set name = p_name, summary = p_summary, description = p_description, category = p_category,
           price_cents = p_price_cents, stock = p_stock, active = p_active,
           image_path = v_image_path, image_alt = v_image_alt, updated_at = now()
     where id = p_id
     returning id into v_id;
    if v_id is null then raise exception 'product_not_found'; end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_product(uuid, text, text, text, text, int, int, boolean, text, text) from public, anon;
grant execute on function public.save_product(uuid, text, text, text, text, int, int, boolean, text, text) to authenticated;
