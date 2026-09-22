# Orbe Gestão

Loja com catálogo, carrinho, pagamento com cartão e painel de gestão. **Loja de
demonstração:** a Orbe, os produtos e os clientes são fictícios, e o pagamento
roda no **modo de teste da Stripe** — nenhuma cobrança real acontece.

Desenvolvido por [Gabriel Andrade](https://gabriel-andrade-omega.vercel.app/).

## O que funciona

**Cliente**
- Cria conta e entra com e-mail e senha.
- Navega pelo catálogo com busca e filtro por categoria, vendo o estoque atual.
- Monta o carrinho, ajusta quantidades e paga com cartão na página da Stripe.
- Acompanha os pedidos em "Meus pedidos": aguardando pagamento, pago, enviado
  ou cancelado. Pode cancelar um pedido que ainda não foi pago.

**Gestão da loja**
- Receita confirmada, pedidos pagos, pedidos aguardando e produtos sem estoque.
- Lista de pedidos de todos os clientes, com marcação de envio.
- Cadastro e edição de produtos: preço, estoque, categoria e visibilidade.

**Conta de teste:** a tela de entrada oferece uma conta de cliente. O painel de
gestão não tem acesso público — ele lê os pedidos de todos os clientes, então
depende de uma conta própria, promovida com `npm run db:admin -- seu@email`.

## Como o pagamento é confirmado

O pedido nasce como `aguardando` e **reserva o estoque**. A pessoa é levada ao
Checkout da Stripe; a volta dela para o site não confirma nada, porque qualquer
um pode abrir a URL de sucesso.

Quem confirma é `POST /api/stripe/webhook`: a Stripe envia o evento
`checkout.session.completed` assinado, a assinatura é conferida com
`STRIPE_WEBHOOK_SECRET` e só então `confirm_paid_order` marca o pedido como
pago. Reenvios do mesmo evento não duplicam nada, e uma assinatura inválida
recebe 400.

Se o pagamento não acontecer, `release_expired_orders` devolve ao estoque o que
ficou reservado além de 30 minutos.

### Cartões de teste

| Situação | Número |
| --- | --- |
| Aprovado | 4242 4242 4242 4242 |
| Recusado | 4000 0000 0000 0002 |
| Exige autenticação | 4000 0025 0000 3155 |

Validade: qualquer data futura. CVC: três dígitos quaisquer.

## Como é feito

- **Next.js 16** (App Router, Server Components e Server Actions), TypeScript e
  Tailwind CSS.
- **Supabase:** Postgres e autenticação, com a sessão em cookies (`@supabase/ssr`).
- **Stripe Checkout** em modo de teste, com confirmação por webhook assinado.
- **Zod:** validação dos formulários no servidor.

### Regras no banco de dados

As regras ficam em funções do Postgres (`supabase/migrations/0002_functions.sql`):

- `create_order` trava cada produto (`select … for update`), confere o estoque,
  **calcula o total com o preço do banco** e reserva as unidades. Duas compras
  simultâneas da última unidade não passam juntas.
- `confirm_paid_order` só é executável pela chave secreta do servidor, e é
  idempotente.
- `cancel_order` e `release_expired_orders` devolvem o estoque reservado.
- `save_product` e `mark_order_shipped` exigem perfil de administração.
- **Row Level Security:** o cliente lê apenas os próprios pedidos; o catálogo
  ativo é público. Não há políticas de escrita direta.

O carrinho fica num cookie do servidor com identificador e quantidade apenas:
nome, preço e estoque vêm sempre do banco, inclusive na hora de cobrar.

## Rodando localmente

Requisitos: Node.js 20.9+, um projeto no [Supabase](https://supabase.com) e uma
conta na [Stripe](https://stripe.com) em modo de teste.

```bash
npm install
cp .env.example .env.local   # preencha com as suas chaves
npm run db:migrate           # tabelas, funções e regras de segurança
npm run db:seed              # conta de teste e pedidos de exemplo
npm run dev
```

Para receber os avisos da Stripe no seu computador, use o
[Stripe CLI](https://stripe.com/docs/stripe-cli):
`stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Estrutura

```
src/
  app/
    page.tsx                  catálogo com busca e filtros
    produto/[slug]/           página do produto
    carrinho/                 carrinho e ida para o pagamento
    pedido/[id]/              acompanhamento de um pedido
    minha-conta/              pedidos do cliente
    painel/                   gestão de pedidos e produtos
    api/stripe/webhook/       confirmação do pagamento
    cart-actions.ts           carrinho, checkout e cancelamento
    admin-actions.ts          produtos e envio
  lib/                        Supabase, Stripe, carrinho, dinheiro, mensagens
  proxy.ts                    renovação de sessão e proteção de rotas
supabase/migrations/          esquema, funções e catálogo inicial
scripts/db.mjs                migrações, dados de teste e promoção a admin
```
