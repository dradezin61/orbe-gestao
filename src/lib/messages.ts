const success = {
  bem_vindo: "Conta criada. Boas compras.",
  adicionado: "Produto adicionado ao carrinho.",
  removido: "Produto removido do carrinho.",
  carrinho_atualizado: "Carrinho atualizado.",
  pedido_pago: "Pagamento confirmado. O pedido já está com a loja.",
  pedido_cancelado: "Pedido cancelado e itens devolvidos ao estoque.",
  produto_salvo: "Produto salvo.",
  pedido_enviado: "Pedido marcado como enviado.",
  senha_alterada: "Senha alterada. Use a nova senha nos próximos acessos.",
  link_enviado: "Se existir uma conta com esse e-mail, o link para criar uma nova senha segue para lá.",
} as const;

const errors = {
  empty_cart: "Seu carrinho está vazio.",
  out_of_stock: "Não há estoque suficiente para essa quantidade.",
  product_unavailable: "Esse produto saiu do catálogo.",
  invalid_quantity: "Quantidade inválida.",
  invalid_price: "Preço inválido.",
  invalid_stock: "Estoque inválido.",
  order_not_found: "Pedido não encontrado.",
  order_not_cancellable: "Esse pedido não pode mais ser cancelado.",
  order_not_payable: "Esse pedido não está aguardando envio.",
  product_not_found: "Produto não encontrado.",
  pagamento_cancelado: "Pagamento não concluído. O pedido segue aguardando; os itens continuam reservados.",
  pagamento_indisponivel: "O pagamento está indisponível no momento. Tente de novo em instantes.",
  forbidden: "Você não tem permissão para essa ação.",
  credenciais: "E-mail ou senha incorretos.",
  email_em_uso: "Já existe uma conta com esse e-mail. Tente entrar.",
  senha_fraca: "Essa senha é muito fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  dados_invalidos: "Confira os dados do formulário.",
  demo_indisponivel: "A conta de teste não está disponível no momento.",
  erro_inesperado: "Algo deu errado. Tente de novo em instantes.",
} as const;

export type SuccessCode = keyof typeof success;
export type ErrorCode = keyof typeof errors;

export function successMessage(code: string | undefined) {
  return code && code in success ? success[code as SuccessCode] : null;
}

export function errorMessage(code: string | undefined) {
  if (!code) return null;
  return code in errors ? errors[code as ErrorCode] : errors.erro_inesperado;
}

/** As funções do banco lançam o código da regra violada como mensagem de erro. */
export function errorCodeFrom(error: { message?: string } | null): ErrorCode {
  const message = error?.message ?? "";
  const code = (Object.keys(errors) as ErrorCode[]).find((key) => message.includes(key));
  return code ?? "erro_inesperado";
}
