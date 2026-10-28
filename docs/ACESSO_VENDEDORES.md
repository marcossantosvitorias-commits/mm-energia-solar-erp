# Acesso dos vendedores a clientes e contratos

A regra foi ativada no Supabase de produção em 27/10/2026 às 23:57 UTC, ou 20:57 no horário de Brasília. O perfil `comercial` pode acessar apenas registros próprios criados após `profiles.sales_access_from`. O administrador mantém visão completa dos dados antigos e novos. Nenhum cliente ou contrato foi apagado, nem houve transferência dos cadastros existentes.

## Banco

A migração `20261027235713_sales_owner_isolation.sql` adiciona a data de corte ao perfil. Os registros novos recebem automaticamente `created_by` e `created_at` a partir da sessão do vendedor. O comercial não pode alterar sua função, permissões ou data de corte, nem trocar responsável/data de um registro para contornar a regra.

As políticas restritivas são combinadas com as permissões anteriores. Clientes e contratos são protegidos na consulta e gravação; propostas, interações, agenda e cópias de dados comerciais relacionadas seguem o mesmo escopo. Os acessos dos demais perfis existentes são preservados pelas políticas de função anteriores.

RPCs internas de propostas e feedback de leads passaram a executar com os privilégios do chamador. O fluxo público de propostas por token continua disponível ao cliente final; ele não libera a listagem interna de contratos.

## Funções publicadas

`autentique-contract` versão 10 valida perfil ativo. O vendedor usa o cliente Supabase com sua própria sessão no envio de novos contratos. A sincronização global é bloqueada para comerciais. Administrador e financeiro mantêm os fluxos anteriores. Ao sincronizar um contrato já existente, seu responsável original é preservado.

`leadconnector-sync` versão 10 restringe a sincronização global ao administrador. O envio de um cliente ao CRM consulta e grava utilizando a sessão do chamador, sujeita às políticas de carteira.

`send-erp-reminders` versão 35 filtra os lembretes destinados ao comercial pelo responsável e data de cadastro. Um comercial não recebe notificações de clientes antigos, de outro vendedor ou alertas financeiros globais. As configurações de autenticação/JWT preexistentes das funções foram preservadas.

## Verificação

A consulta com o contexto real do administrador confirmou 424 clientes e 30 contratos visíveis, iguais às quantidades gerais do banco. Duas contas comerciais recentes foram verificadas e não conseguem consultar o acervo anterior, registros sem responsável nem registros novos de outro usuário. A função de acesso permite registros novos do próprio vendedor.

Um teste de inserção, totalmente dentro de transação desfeita por `ROLLBACK`, confirmou que cliente e contrato recebem o responsável da sessão do vendedor, mesmo quando o payload tenta indicar outro usuário e uma data antiga. O administrador visualizou ambos. Após o rollback, o banco permaneceu com 424 clientes e 30 contratos e sem registros de teste.

As três funções alteradas passaram pela checagem Deno de sintaxe e tipos antes da publicação. Não foram enviadas assinaturas, notificações ou contatos de teste a serviços externos.

## Limite de abrangência

O bloqueio controla a consulta aos dados no ERP. PDFs já baixados, informações já copiadas e links externos de assinatura ou arquivos já compartilhados não são recolhidos ou revogados automaticamente. Revogar links de clientes no Autentique é uma operação separada e não foi executada.
