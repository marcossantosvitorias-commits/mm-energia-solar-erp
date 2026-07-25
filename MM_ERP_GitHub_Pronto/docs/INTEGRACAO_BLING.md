# Integração MM ERP AI ↔ Bling

## Segurança

- O `BLING_CLIENT_SECRET`, os access tokens e refresh tokens nunca ficam no React ou no GitHub.
- Os tokens são gravados em `bling_connections`, uma tabela sem políticas de leitura para o navegador.
- Somente as Supabase Edge Functions, usando a service-role interna, acessam os tokens.
- A sincronização inicial é manual e não destrutiva.
- Clientes já vinculados por `bling_id` não são enviados novamente.

## 1. Executar a migration

No SQL Editor do Supabase, execute:

`supabase/migrations/20260724_003_bling_integration.sql`

## 2. Corrigir o link de redirecionamento no Bling

No aplicativo privado **MM ERP AI**, use exatamente:

`https://omrxpnxoakwanlskzaax.supabase.co/functions/v1/bling-oauth-callback`

O endereço precisa ser idêntico ao configurado em `BLING_REDIRECT_URI`.

## 3. Configurar segredos no Supabase

Em **Project Settings → Edge Functions → Secrets**, cadastre:

- `BLING_CLIENT_ID`: Client ID do aplicativo MM ERP AI.
- `BLING_CLIENT_SECRET`: Client Secret do aplicativo. Nunca colocar no frontend.
- `BLING_REDIRECT_URI`: `https://omrxpnxoakwanlskzaax.supabase.co/functions/v1/bling-oauth-callback`
- `ERP_APP_URL`: URL pública do ERP terminando em `/app/bling`.

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente às Edge Functions hospedadas no Supabase.

## 4. Publicar as funções

Publicar estas funções no Supabase:

- `bling-oauth-start` — exige JWT do usuário do ERP.
- `bling-oauth-callback` — callback público do OAuth; configurar sem verificação JWT.
- `bling-api` — exige JWT do usuário do ERP.

Exemplo usando Supabase CLI:

```bash
supabase functions deploy bling-oauth-start
supabase functions deploy bling-oauth-callback --no-verify-jwt
supabase functions deploy bling-api
```

## 5. Teste seguro

1. Publicar a branch em ambiente de teste ou revisar o Pull Request.
2. Entrar no ERP com o administrador.
3. Abrir **Integração Bling**.
4. Clicar em **Conectar ao Bling**.
5. Autorizar o aplicativo privado.
6. Confirmar que o status ficou `Conectado`.
7. Cadastrar um cliente de teste com nome, telefone e UF válidos.
8. Clicar em **Enviar clientes ao Bling**.
9. Conferir o contato no Bling e o `bling_id` na tabela `clients`.

## Limites

A função envia no máximo 100 clientes pendentes por execução e espera 400 ms entre requisições, respeitando o limite geral de 3 requisições por segundo do Bling.

## Reversão

A integração não apaga clientes, dados locais ou registros do Bling. Para interromper:

- clicar em **Desconectar** no ERP; ou
- não fazer o merge da branch `feature/bling-integration`.
