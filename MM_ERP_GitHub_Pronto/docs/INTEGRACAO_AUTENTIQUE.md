# Integração do MM ERP com o Autentique

## O que foi implementado

- geração de contrato em PDF dentro da página Contratos;
- preenchimento automático com nome, CPF/CNPJ, telefone, e-mail e endereço do cadastro do cliente;
- local da instalação preenchido com o endereço do cliente e editável;
- prazo contratual fixado em 69 dias corridos;
- campo livre para forma de pagamento;
- envio do PDF para assinatura por WhatsApp ou e-mail;
- token privado do Autentique mantido somente no Supabase.

## 1. Obter o token da API

Entre no Autentique e gere um token de API para a organização da MM Energia Solar.

Nunca coloque esse token no React, no GitHub ou em variável `VITE_*`.

## 2. Configurar o segredo no Supabase

No terminal conectado ao projeto Supabase:

```bash
supabase secrets set AUTENTIQUE_API_TOKEN="SEU_TOKEN_PRIVADO"
```

## 3. Publicar a Edge Function

```bash
supabase functions deploy autentique-contract
```

A função valida a sessão do usuário do ERP e envia o arquivo para:

```text
https://api.autentique.com.br/v2/graphql
```

## 4. Teste recomendado

1. Abra Contratos no ERP.
2. Selecione um cliente com CPF/CNPJ e endereço.
3. Informe o valor e a forma de pagamento.
4. Clique em Gerar PDF e confira o documento.
5. Faça um teste com seu próprio e-mail ou telefone antes de enviar a um cliente.
6. Depois clique em Enviar para assinar por WhatsApp ou por e-mail.

## Observações

- Para envio por WhatsApp, o telefone precisa estar cadastrado com DDD. O ERP acrescenta o código +55 automaticamente.
- Para envio por e-mail, o cliente precisa ter um e-mail válido cadastrado.
- O Autentique pode cobrar pelo uso da API e pelo método de envio conforme o plano da conta.
- O contrato gerado usa o modelo comercial da MM Energia Solar e deve ser revisado juridicamente antes de uso recorrente.
