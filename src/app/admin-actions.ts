"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { errorCodeFrom } from "@/lib/messages";
import { categories } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

const produtoSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional(),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(categories),
  // Preço digitado em reais, guardado em centavos.
  price: z.coerce.number().positive().max(100000),
  stock: z.coerce.number().int().min(0).max(100000),
  active: z.literal(["on", null]).optional(),
});

export async function saveProduct(formData: FormData) {
  await requireAdmin();

  const parsed = produtoSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: String(formData.get("price") ?? "").replace(".", "").replace(",", "."),
    stock: formData.get("stock"),
    active: formData.get("active"),
  });
  if (!parsed.success) redirect("/painel?aba=produtos&erro=dados_invalidos");

  const { id, name, summary, description, category, price, stock, active } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_product", {
    p_id: id || null,
    p_name: name,
    p_summary: summary,
    p_description: description,
    p_category: category,
    p_price_cents: Math.round(price * 100),
    p_stock: stock,
    p_active: active === "on",
  });
  if (error) redirect(`/painel?aba=produtos&erro=${errorCodeFrom(error)}`);

  revalidatePath("/", "layout");
  redirect("/painel?aba=produtos&ok=produto_salvo");
}

export async function markShipped(formData: FormData) {
  await requireAdmin();
  const pedido = z.uuid().safeParse(formData.get("orderId"));
  if (!pedido.success) redirect("/painel?erro=order_not_found");

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_order_shipped", { p_order: pedido.data });
  if (error) redirect(`/painel?erro=${errorCodeFrom(error)}`);

  revalidatePath("/", "layout");
  redirect("/painel?ok=pedido_enviado");
}
