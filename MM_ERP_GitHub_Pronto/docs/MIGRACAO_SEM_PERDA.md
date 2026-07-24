# Migração segura dos dados locais para o Supabase

## Regra principal

A migração não apaga nem substitui os dados atuais do navegador.

O processo correto é:

1. gerar um backup JSON completo do localStorage;
2. enviar os registros para o Supabase com proteção contra duplicidade;
3. conferir as quantidades no banco;
4. manter o localStorage como cópia temporária;
5. somente retirar o modo local depois da validação manual.

## Dados atualmente protegidos

- clientes e leads;
- movimentações financeiras;
- contas a pagar;
- contas a receber;
- equipamentos e outras chaves `mm-erp-*` no arquivo de backup;
- simulações e cotações armazenadas no navegador.

## Serviços adicionados

- `src/services/localDataSafety.js`
  - coleta todas as chaves `mm-erp-*`;
  - gera backup JSON para download;
  - permite restauração;
  - registra o estado da migração.

- `src/services/supabaseMigrationService.js`
  - migra clientes;
  - migra fluxo de caixa;
  - migra contas a pagar;
  - migra contas a receber;
  - usa `external_id` para evitar duplicidades;
  - nunca remove registros do navegador.

## Ativação

A ativação automática ainda não deve ser feita enquanto houver dados sendo cadastrados no ERP em produção.

Primeiro deve ser adicionada uma tela de migração no ERP com os botões:

- Baixar backup;
- Conferir dados locais;
- Migrar para Supabase;
- Validar quantidades;
- Ativar banco central.

Somente após a validação o ERP deve passar a usar o Supabase como fonte principal.
