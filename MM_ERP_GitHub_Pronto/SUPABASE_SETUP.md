# Ativação do Supabase no MM ERP

Esta versão usa o Supabase como fonte única dos dados de negócio. O navegador não grava clientes, finanças, contratos, cotações, equipamentos, configurações ou dados do Bling.

## 1. Preparar o projeto Supabase

1. Entre em `https://supabase.com/dashboard`.
2. Abra o projeto que será usado pelo MM ERP ou crie um projeto novo.
3. Em **SQL Editor**, execute, nesta ordem:
   - `supabase/migrations/20260724_001_initial_erp.sql`
   - `supabase/migrations/20260724_002_complete_erp.sql`
   - `supabase/migrations/20260725_003_supabase_source_of_truth.sql`
4. Confirme que não houve erro antes de seguir.

A terceira migration cria contratos, cotações de fornecedores, configurações, propostas, escopos financeiros e os registros iniciais já informados no ERP.

## 2. Criar o usuário administrador

1. No Supabase, abra **Authentication → Users**.
2. Clique em **Add user → Create new user**.
3. Cadastre o e-mail do administrador.
4. Defina a senha desejada e marque o e-mail como confirmado.
5. A trigger da primeira migration cria automaticamente o perfil ativo com função `admin`.

Não coloque senha, chave `service_role` ou token privado no GitHub ou na Hostinger.

## 3. Copiar as duas informações públicas

Em **Project Settings → API**, copie:

- **Project URL**
- **Publishable key** (ou chave `anon` em projetos antigos)

Nunca use a chave `service_role` no frontend.

## 4. Configurar a Hostinger

No painel da aplicação `erp.mmenergiasolar.com.br`:

1. Abra **Configurações de implantação → Variáveis de ambiente**.
2. Adicione:

```text
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICAVEL
```

3. Salve as variáveis.
4. Reimplante a aplicação somente depois que as três migrations e o usuário administrador estiverem prontos.

## 5. Migrar os dados que ainda estão no celular

Após publicar e entrar no ERP com a conta Supabase:

1. Abra **Migração para o Supabase** no menu.
2. Clique em **Baixar backup JSON**.
3. Clique em **Migrar e limpar navegador**.
4. A limpeza só acontece depois que todas as gravações terminarem sem erro.
5. Atualize a página e confirme que os mesmos dados continuam aparecendo.
6. Entre em outro dispositivo para confirmar que a base é realmente compartilhada.

## 6. Validação final

Verifique estes módulos:

- clientes, inclusive endereço e CEP;
- financeiro da empresa, separado por mês;
- financeiro do Marcos;
- contas a pagar e a receber;
- contratos e previsão de instalação;
- cotações e cálculo de preços Belenus;
- propostas e simulações BelCred;
- equipamentos por fornecedor;
- importação do Bling;
- simulador tributário.

A sessão de autenticação do Supabase continua sendo mantida pelo navegador para evitar novo login a cada atualização. Isso é apenas a sessão; os dados do ERP permanecem no banco.
