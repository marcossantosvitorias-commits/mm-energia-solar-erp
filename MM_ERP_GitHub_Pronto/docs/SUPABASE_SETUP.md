# Ativação do Supabase no MM ERP

## 1. Criar as tabelas

No painel do Supabase, abra **SQL Editor**, clique em **New query**, copie todo o conteúdo de:

`supabase/migrations/20260724_001_initial_erp.sql`

Execute em **Run**.

Isso cria as tabelas, índices, gatilhos e políticas RLS do ERP.

## 2. Criar o primeiro usuário

No painel do Supabase, abra **Authentication > Users > Add user** e crie o usuário administrador.

Após a criação, será criado automaticamente um registro na tabela `profiles` com perfil `admin`.

## 3. Configurar a Hostinger

No projeto do site, adicione estas variáveis de ambiente:

```env
VITE_SUPABASE_URL=https://omrxpnxoakwanlskzaax.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_COLE_A_CHAVE_PUBLICA_AQUI
```

Nunca coloque `sb_secret_...` no frontend.

## 4. Publicar novamente

Depois de salvar as variáveis, execute uma nova implantação na Hostinger.

## 5. Testar

1. Entre no ERP.
2. Cadastre um cliente em `/app/clientes`.
3. Confira o registro em **Table Editor > clients**.
4. Importe um OFX e confira `financial_transactions`.
5. Importe um CSV de contas e confira `accounts_payable`.

## Estrutura inicial

- `profiles`
- `clients`
- `suppliers`
- `financial_transactions`
- `accounts_payable`
- `accounts_receivable`
- `data_imports`
- `belcred_simulations`
