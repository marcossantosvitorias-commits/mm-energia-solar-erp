# Banco de dados central — MM ERP AI

O MM ERP AI usa PocketBase como banco de dados e API. O arquivo SQLite real fica em `apps/pocketbase/pb_data` no servidor e **não deve ser publicado no GitHub**, mesmo com o repositório privado.

## Estrutura criada

A migration `apps/pocketbase/pb_migrations/1784898000_create_erp_database.js` cria automaticamente:

- `users`: usuários, funções e acesso;
- `clients`: clientes e leads;
- `suppliers`: fornecedores;
- `financial_transactions`: fluxo de caixa e OFX;
- `accounts_payable`: contas a pagar e CSV;
- `accounts_receivable`: contas a receber;
- `data_imports`: histórico das importações e prevenção de duplicidades.

## Como publicar

1. No servidor, entre na pasta `apps/pocketbase`.
2. Mantenha `pb_data` em um volume persistente e privado.
3. Inicie o PocketBase com:

```bash
./pocketbase serve --http=0.0.0.0:8090
```

As migrations pendentes são aplicadas automaticamente ao iniciar o servidor. Também podem ser aplicadas manualmente:

```bash
./pocketbase migrate up
```

4. Crie o primeiro administrador:

```bash
./pocketbase superuser create SEU_EMAIL UMA_SENHA_FORTE
```

5. Abra o painel administrativo em:

```text
https://SEU-DOMINIO-DO-BANCO/_/
```

6. Na coleção `users`, crie o usuário que entrará no ERP. Use:

- `role`: `admin`;
- `active`: marcado;
- e-mail e senha fortes.

7. Configure a variável do site na Hostinger:

```env
VITE_POCKETBASE_URL=https://SEU-DOMINIO-DO-BANCO
```

Depois, publique novamente o frontend.

## Segurança obrigatória

- Não versionar a pasta `pb_data`.
- Não colocar senha, token ou chave em arquivos do GitHub.
- Usar HTTPS no domínio do PocketBase.
- Fazer backup diário do diretório `pb_data`.
- Restringir o painel `/_/` por senha forte e, preferencialmente, firewall ou Cloudflare Access.
- Não usar a URL local `127.0.0.1:8090` no site publicado.

## Alimentação dos dados

Depois que o PocketBase estiver publicado e conectado, os arquivos OFX e CSV poderão ser enviados ao ERP e persistidos nas coleções centrais. O serviço preparado no frontend é:

```text
apps/web/src/services/financeDatabaseService.js
```

Ele inclui gravação, atualização por identificador único, importação em lote e bloqueio de duplicidade pelo campo `externalId`.

## Backups

O conteúdo efetivo do banco fica no servidor, normalmente em:

```text
apps/pocketbase/pb_data/data.db
```

Faça backup do diretório `pb_data` inteiro. Para restaurar, pare o PocketBase, substitua o diretório pelo backup e inicie o serviço novamente.
