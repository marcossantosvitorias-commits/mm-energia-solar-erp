# Ativação das notificações push do MM ERP

A implementação usa Web Push, Supabase Edge Functions e Supabase Cron. Depois de ativada, o celular recebe alertas mesmo quando o PWA está fechado.

## 1. Aplicar a migration

No Supabase SQL Editor, execute:

```text
supabase/migrations/20260726000500_push_notifications.sql
```

Ela cria as tabelas `appointments`, `push_subscriptions` e `notification_deliveries`.

## 2. Gerar as chaves VAPID

Em um terminal com Node.js:

```bash
npx web-push generate-vapid-keys
```

Guarde a chave privada. Nunca coloque a chave privada no GitHub ou no frontend.

## 3. Configurar o frontend na Hostinger

Adicione esta variável de ambiente à aplicação:

```text
VITE_VAPID_PUBLIC_KEY=SUA_CHAVE_PUBLICA_VAPID
```

Depois faça uma nova implantação do ERP.

## 4. Configurar os segredos da Edge Function

No terminal autenticado no Supabase CLI:

```bash
supabase link --project-ref omrxpnxoakwanlskzaax
supabase secrets set VAPID_PUBLIC_KEY="SUA_CHAVE_PUBLICA"
supabase secrets set VAPID_PRIVATE_KEY="SUA_CHAVE_PRIVADA"
supabase secrets set VAPID_SUBJECT="mailto:mmenergiasolar@hotmail.com"
supabase secrets set CRON_SECRET="CRIE_UMA_SENHA_LONGA_E_ALEATORIA"
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados automaticamente à Edge Function pelo Supabase.

## 5. Publicar a função

A partir da pasta `MM_ERP_GitHub_Pronto`:

```bash
supabase functions deploy send-erp-reminders --no-verify-jwt
```

Teste manualmente, substituindo o segredo:

```bash
curl -X POST \
  "https://omrxpnxoakwanlskzaax.supabase.co/functions/v1/send-erp-reminders" \
  -H "x-cron-secret: SEU_CRON_SECRET"
```

A resposta deve conter `"ok": true`.

## 6. Criar a execução automática

No Supabase Dashboard, abra **Integrations → Cron** e crie um job:

- Nome: `send-erp-reminders`
- Frequência: a cada 5 minutos (`*/5 * * * *`)
- Método: POST
- URL: `https://omrxpnxoakwanlskzaax.supabase.co/functions/v1/send-erp-reminders`
- Header: `x-cron-secret: SEU_CRON_SECRET`
- Body: `{}`

O intervalo de 5 minutos permite avisos de agenda próximos do horário sem executar a função excessivamente.

## 7. Ativar no celular

1. Abra o MM ERP instalado.
2. Entre na Agenda.
3. Toque em **Ativar notificações no celular**.
4. Autorize as notificações do Android.
5. A mensagem deve informar que as notificações push foram conectadas ao Supabase.

Cada aparelho precisa fazer essa ativação uma vez. O registro fica em `push_subscriptions`.

## Alertas enviados

### Boletos

- três dias antes;
- um dia antes;
- no dia do vencimento;
- diariamente enquanto estiver vencido e pendente.

### Agenda

- aproximadamente 24 horas antes;
- aproximadamente uma hora antes;
- no horário do compromisso.

A tabela `notification_deliveries` impede o envio duplicado do mesmo alerta para o mesmo celular.
