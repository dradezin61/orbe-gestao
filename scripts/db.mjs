// Prepara o banco do Supabase a partir do .env.local.
//   node scripts/db.mjs migrate        -> aplica supabase/migrations na ordem, uma vez cada
//   node scripts/db.mjs seed           -> conta de teste e pedidos fictícios
//   node scripts/db.mjs admin <e-mail> -> promove uma conta existente a administradora
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const required = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name] || process.env[name].includes("COLE_AQUI"));
if (missing.length) {
  console.error(`Faltam valores no .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/** Conta de teste pública: cliente comum, sem acesso ao painel. */
const DEMO_CUSTOMER = { email: "cliente.teste@example.com", fullName: "Cliente de Teste" };

async function migrate() {
  await db.query("create schema if not exists app_private");
  await db.query(
    "create table if not exists app_private.migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set((await db.query("select name from app_private.migrations")).rows.map((r) => r.name));
  const dir = join("supabase", "migrations");

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) {
      console.log(`  já aplicada  ${file}`);
      continue;
    }
    await db.query("begin");
    try {
      await db.query(readFileSync(join(dir, file), "utf8"));
      await db.query("insert into app_private.migrations (name) values ($1)", [file]);
      await db.query("commit");
      console.log(`  aplicada     ${file}`);
    } catch (error) {
      await db.query("rollback");
      throw new Error(`Falhou em ${file}: ${error.message}`);
    }
  }
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

/** Cria a conta de teste (se faltar) e deixa alguns pedidos no histórico dela. */
async function seed() {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("Defina DEMO_PASSWORD no .env.local antes de rodar o seed.");

  const admin = adminClient();
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = existing?.users.find((u) => u.email === DEMO_CUSTOMER.email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_CUSTOMER.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: DEMO_CUSTOMER.fullName },
    });
    if (error) throw new Error(`Não criei a conta de teste: ${error.message}`);
    user = data.user;
    console.log(`  conta de teste criada: ${DEMO_CUSTOMER.email}`);
  } else {
    await admin.auth.admin.updateUserById(user.id, { password });
    console.log(`  conta de teste já existia: ${DEMO_CUSTOMER.email}`);
  }

  await db.query("update public.profiles set full_name = $2 where id = $1", [user.id, DEMO_CUSTOMER.fullName]);

  const { rows: pedidos } = await db.query("select count(*)::int as n from public.orders where user_id = $1", [user.id]);
  if (pedidos[0].n > 0) {
    console.log(`  a conta de teste já tem ${pedidos[0].n} pedido(s); nada a fazer`);
    return;
  }

  // Um pedido pago e um enviado, para a área do cliente e o painel não nascerem vazios.
  const { rows: produtos } = await db.query("select id, name, price_cents from public.products order by name limit 3");
  const historico = [
    { status: "pago", itens: produtos.slice(0, 2), dias: 2 },
    { status: "enviado", itens: produtos.slice(2, 3), dias: 9 },
  ];

  for (const pedido of historico) {
    const total = pedido.itens.reduce((soma, p) => soma + p.price_cents, 0);
    const { rows } = await db.query(
      `insert into public.orders (user_id, status, total_cents, created_at, paid_at, shipped_at)
       values ($1, $2, $3, now() - ($4 || ' days')::interval, now() - ($4 || ' days')::interval,
               case when $2 = 'enviado' then now() - (($4::int - 1) || ' days')::interval end)
       returning id`,
      [user.id, pedido.status, total, String(pedido.dias)],
    );
    for (const item of pedido.itens) {
      await db.query(
        `insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
         values ($1, $2, $3, $4, 1)`,
        [rows[0].id, item.id, item.name, item.price_cents],
      );
    }
    console.log(`  pedido ${pedido.status} com ${pedido.itens.length} item(ns)`);
  }
}

/**
 * Promove uma conta existente a administradora. Fora das migrações para o
 * e-mail não ir ao repositório: o painel lê os pedidos de todos os clientes,
 * então não pode ficar atrás de um botão público.
 */
async function grantAdmin(email) {
  const { rows } = await db.query(
    `update public.profiles p set role = 'admin'
       from auth.users u
      where u.id = p.id and lower(u.email) = lower($1)
      returning p.full_name`,
    [email],
  );
  if (!rows.length) throw new Error("Nenhuma conta com esse e-mail. Crie a conta no app antes de promovê-la.");
  console.log(`  ${rows[0].full_name} agora administra a loja.`);
}

const command = process.argv[2];
const argument = process.argv[3];
if (!["migrate", "seed", "admin"].includes(command) || (command === "admin" && !argument)) {
  console.error("Use: node scripts/db.mjs migrate | seed | admin <e-mail>");
  process.exit(1);
}

await db.connect();
try {
  console.log(
    command === "migrate" ? "Aplicando migrações..." : command === "seed" ? "Preparando dados de teste..." : "Promovendo a conta...",
  );
  await (command === "migrate" ? migrate() : command === "seed" ? seed() : grantAdmin(argument));
  console.log("Pronto.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
