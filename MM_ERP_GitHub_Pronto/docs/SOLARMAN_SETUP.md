# Integração SOLARMAN — ERP 2.0 Preview

## 1. Solicitar acesso oficial

Solicitar a ativação da OpenAPI à SOLARMAN e obter `APP_ID` e `APP_SECRET`. Informar que a MM Energia Solar é uma instaladora e que a finalidade é reunir, em um painel próprio, as usinas autorizadas dos clientes.

A SOLARMAN informa que contas Business e contas Smart com mais de três usinas podem exigir plano pago.

## 2. Segredos necessários no Supabase

Configurar os seguintes segredos na função de servidor:

- `SOLARMAN_APP_ID`
- `SOLARMAN_APP_SECRET`
- `SOLARMAN_EMAIL`
- `SOLARMAN_PASSWORD`
- `SOLARMAN_ORG_ID` — opcional, necessário quando a conta Business precisa de token de comerciante
- `SOLARMAN_BASE_URL` — opcional; padrão internacional: `https://globalapi.solarmanpv.com`

Nunca colocar esses valores em arquivos `.env` versionados, no React ou em campos salvos no navegador.

## 3. Publicar a função

```bash
supabase functions deploy solar-monitoring
```

Depois, cadastrar os segredos pelo painel do Supabase ou pela CLI.

## 4. Fluxo implementado

1. O React chama a Edge Function `solar-monitoring`.
2. A função gera o SHA-256 da senha no servidor.
3. A função solicita um token oficial à SOLARMAN.
4. A função consulta a lista de usinas autorizadas.
5. Apenas os dados normalizados das usinas retornam ao navegador.

## 5. Ações disponíveis

- `health`: informa se os segredos mínimos estão configurados.
- `listPlants`: autentica e retorna a lista normalizada de usinas SOLARMAN.

## 6. Próximas evoluções

- cache seguro do token;
- dados em tempo real por usina;
- alarmes e histórico;
- associação automática entre usina e cadastro do cliente;
- sincronização programada;
- conectores Fronius, Growatt, APsystems e TSUN.
