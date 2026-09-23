-- Revisão do catálogo: fotografia, texto e preço dos 12 produtos que já existem.
--
-- Roda em uma transação só (o runner abre begin/commit): ou tudo entra, ou nada.
-- Antes de alterar, guarda os valores atuais em app_private.catalog_backup, o
-- que permite desfazer esta revisão sem adivinhação. Estoque, ids, slugs,
-- pedidos e os preços já registrados em order_items ficam intocados: pedidos
-- antigos continuam valendo o que valiam.

create schema if not exists app_private;

create table if not exists app_private.catalog_backup (
  revision text not null,
  slug text not null,
  name text not null,
  summary text not null,
  description text not null,
  price_cents int not null,
  image_path text,
  image_alt text,
  saved_at timestamptz not null default now(),
  primary key (revision, slug)
);

-- Se algum slug esperado não existir, nada é alterado e a migração diz qual falta.
do $$
declare
  v_faltando text;
begin
  select string_agg(s, ', ') into v_faltando
    from unnest(array[
      'cadeira-linea', 'caderno-pautado', 'capa-notebook-feltro', 'jarra-vidro', 'kit-canetas',
      'luminaria-arco', 'mesa-lateral-orbe', 'organizador-mesa', 'luminaria-pendente-esfera',
      'porta-cabos-couro', 'prateleira-modular', 'suporte-notebook'
    ]) as s
   where not exists (select 1 from public.products p where p.slug = s);

  if v_faltando is not null then
    raise exception 'Catálogo diferente do esperado; slugs ausentes: %', v_faltando;
  end if;
end $$;

insert into app_private.catalog_backup (revision, slug, name, summary, description, price_cents, image_path, image_alt)
select '0006', p.slug, p.name, p.summary, p.description, p.price_cents, p.image_path, p.image_alt
  from public.products p
 where p.slug in (
   'cadeira-linea', 'caderno-pautado', 'capa-notebook-feltro', 'jarra-vidro', 'kit-canetas',
   'luminaria-arco', 'mesa-lateral-orbe', 'organizador-mesa', 'luminaria-pendente-esfera',
   'porta-cabos-couro', 'prateleira-modular', 'suporte-notebook'
 )
on conflict (revision, slug) do nothing;

update public.products p
   set name = n.name,
       summary = n.summary,
       description = n.description,
       price_cents = n.price_cents,
       image_path = n.image_path,
       image_alt = n.image_alt,
       updated_at = now()
  from (
    values
      ('cadeira-linea', 'Cadeira Línea', 'Assento e encosto em madeira clara, pés torneados.', 'Cadeira de madeira clara, com assento e encosto moldados e pés torneados. Linhas simples, para a mesa de jantar ou a escrivaninha.', 34990, '/products/cadeira-linea.jpg', 'Cadeira de madeira clara encostada na parede, sob uma persiana de madeira.'),
      ('caderno-pautado', 'Caderno Pautado', 'Folhas pautadas e encadernação em espiral.', 'Caderno de folhas pautadas com encadernação em espiral, que abre plano sobre a mesa e não fecha sozinho enquanto você escreve.', 2990, '/products/caderno-pautado.jpg', 'Caderno pautado aberto, com espiral branca, sobre uma mesa clara ao lado de caneta e régua.'),
      ('capa-notebook-feltro', 'Capa de Feltro', 'Feltro cinza com aba de couro e botão.', 'Capa de feltro para notebook, com aba de couro e botão de pressão. O feltro amortece as batidas e evita riscos no transporte.', 6990, '/products/capa-notebook-feltro.jpg', 'Capa de feltro cinza fechada por uma aba de couro marrom com botão metálico, com um notebook dentro.'),
      ('jarra-vidro', 'Jarra de Vidro', 'Vidro trabalhado, com alça e bico.', 'Jarra de vidro trabalhado, com alça larga e bico que ajuda a servir sem derramar. Para água, sucos e chá gelado.', 5990, '/products/jarra-vidro.jpg', 'Jarra de vidro trabalhado, com alça, fotografada sobre fundo claro.'),
      ('kit-canetas', 'Kit de Canetas', 'Canetas coloridas em estojo com zíper.', 'Conjunto de canetas de ponta fina em cores variadas, guardadas em um estojo de tecido com zíper.', 3990, '/products/kit-canetas.jpg', 'Canetas coloridas saindo de um estojo de tecido preto com zíper.'),
      ('luminaria-arco', 'Luminária de Mesa', 'Base de madeira e cúpula de tecido.', 'Luminária de mesa com base cilíndrica de madeira e cúpula de tecido claro, que espalha uma luz quente sem ofuscar.', 12990, '/products/luminaria-arco.jpg', 'Luminária de mesa acesa, com base cilíndrica de madeira escura e cúpula de tecido branco.'),
      ('mesa-lateral-orbe', 'Mesa Lateral Orbe', 'Tampo redondo de madeira sobre pés finos.', 'Mesa lateral de tampo redondo em madeira clara, apoiada em pés finos de metal. Na altura do braço do sofá ou da poltrona.', 17990, '/products/mesa-lateral-orbe.jpg', 'Mesa lateral redonda de madeira clara com pés brancos finos, com uma xícara de café e um vaso pequeno em cima.'),
      ('organizador-mesa', 'Organizador de Mesa', 'Porta-canetas de metal perfurado.', 'Porta-canetas cilíndrico em metal perfurado, com base firme. Mantém canetas, lápis e tesoura ao alcance da mão.', 4990, '/products/organizador-mesa.jpg', 'Porta-canetas de metal preto perfurado, cheio de canetas, sobre fundo claro.'),
      ('luminaria-pendente-esfera', 'Pendente Esfera', 'Globo de vidro transparente com cabo preto.', 'Pendente com globo de vidro transparente e cabo preto, que deixa a lâmpada à vista. Sobre a mesa de jantar ou a bancada da cozinha.', 17990, '/products/luminaria-pendente-esfera.jpg', 'Pendente de globo de vidro transparente aceso, com a lâmpada de filamento à vista.'),
      ('porta-cabos-couro', 'Bandeja de Couro', 'Bandeja de couro para o que fica solto na mesa.', 'Bandeja de couro com bordas costuradas, para reunir cabo, cartões e caneta em um lugar só ao fim do dia.', 2490, '/products/porta-cabos-couro.jpg', 'Bandeja quadrada de couro marrom com um cabo enrolado, um porta-cartões, uma régua e uma caneta.'),
      ('prateleira-modular', 'Prateleira Modular', 'Tábua de compensado sobre suportes de parede.', 'Prateleira de compensado com as lâminas à vista na borda, apoiada em suportes fixos à parede. Pode ser repetida em mais de uma altura.', 9990, '/products/prateleira-modular.jpg', 'Prateleira de compensado claro fixada na parede, vista de perto pela borda.'),
      ('suporte-notebook', 'Suporte para Notebook', 'Base curva de madeira que eleva a tela.', 'Suporte de madeira em curva, que eleva o notebook até a altura dos olhos e libera espaço para o teclado embaixo.', 8990, '/products/suporte-notebook.jpg', 'Suporte de madeira curvo com um notebook aberto em cima, sobre uma mesa de madeira.')
  ) as n (slug, name, summary, description, price_cents, image_path, image_alt)
 where p.slug = n.slug;
