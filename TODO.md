# Controle de acesso por vendedor

- [x] O vendedor não pode acessar clientes e contratos antigos nem cadastros de outros vendedores. Pode acessar apenas os novos registros criados por ele após a ativação desta regra.
- [x] O administrador continua vendo todos os clientes e contratos, inclusive todos os cadastros novos feitos pelos vendedores. Nenhum registro existente foi apagado.
- [x] A restrição foi aplicada no banco, nas funções de contratos e sincronização de clientes e nos lembretes. Dados relacionados que poderiam expor clientes ou contratos antigos também respeitam o escopo.

Ativado em 27/10/2026 às 20h57, horário de Brasília. Verificação transacional confirmou 424 clientes e 30 contratos acessíveis ao administrador; contas comerciais testadas não acessam o acervo anterior. O teste de cadastro novo confirmou a identificação automática do vendedor e a visibilidade administrativa. Todas as inserções de teste foram desfeitas por rollback.

Links externos de assinatura e PDFs já recebidos/baixados não são revogados por estas permissões. A restrição controla a consulta de dados no ERP.
