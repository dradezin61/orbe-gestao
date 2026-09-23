-- Fotografia do produto. Caminho relativo servido pelo próprio app
-- (public/products/...) e texto alternativo obrigatório na prática, ainda que
-- nulo no banco para não quebrar os registros que já existem.
alter table public.products
  add column image_path text,
  add column image_alt text;

comment on column public.products.image_path is 'Caminho da fotografia, por exemplo /products/jarra-vidro.jpg';
comment on column public.products.image_alt is 'Descrição da fotografia para quem não a vê';
