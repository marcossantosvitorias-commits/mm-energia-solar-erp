# Análise profissional da MM Energia Solar ERP

## Diagnóstico atual

A ERP já possui uma base forte para operação solar: CRM centralizado, propostas, precificação de kits, calculadora solar, ordens de serviço, checklist de instalação, fotos, assinatura, monitoramento e financeiro. O ponto que mais limita a percepção de produto profissional é a falta de uma entidade operacional única para o **projeto de engenharia**. Hoje o usuário precisa alternar entre cliente, proposta, ordem de serviço, fluxos e pós-venda para reconstruir o contexto de uma mesma instalação.

O principal risco não é falta de telas. É dispersão de informação. Um projeto precisa ter um número, cliente, unidade consumidora, distribuidora, dados técnicos, prazo, documentos, protocolo, responsáveis, pendências e histórico. Esses dados devem permanecer ligados do primeiro cadastro até a homologação e a instalação.

Visualmente, a ERP tem bons componentes reutilizáveis, mas ainda mistura padrões. Há páginas com cartões e formulários longos, outras com tabelas densas e outras com ações em locais diferentes. Isso aumenta o custo cognitivo no celular. A direção recomendada é reduzir campos visíveis de uma vez, usar etapas claras, destacar a próxima ação e reservar detalhes técnicos para abas ou seções contextuais.

## Nova página entregue

Foi criada a rota protegida `/app/projetos-engenharia`, acessível no menu **Operacional → Projetos de engenharia** para administradores, financeiro e engenharia.

A página foi desenhada como um centro de projetos e não como um cadastro isolado. Ela contém indicadores de projetos ativos, pendências, protocolos e aprovações; cadastro técnico vinculado ao cliente central; seleção de distribuidora e unidade consumidora; dados de potência, módulos e inversor; prazo interno e protocolo; filtros por status; lista de projetos; progresso visual; timeline; documentos; tarefas e atualização de status.

O banco recebeu as tabelas `engineering_projects`, `engineering_project_activities`, `engineering_project_documents` e `engineering_project_tasks`, com políticas de acesso para usuários autenticados ativos. O projeto fica ligado ao cadastro central de clientes, evitando outra base paralela.

A estrutura foi inspirada nos fluxos públicos do GD Pro e da Treviso Engenharia, que destacam funil de projetos, documentos, protocolos, prazos, atividades, comunicação e acompanhamento em tempo real. A nova página usa os mesmos princípios de operação, mas mantém o estilo, a navegação e a identidade da MM Energia Solar. Fontes: [GD Pro](https://gdpro.app/) [GD Pro — homologação](https://gdpro.app/sistema-de-homologacao-de-energia-solar/) [Treviso Engenharia](https://trevisoengenharia.com/fotovoltaico/).

## Direção visual recomendada

A direção escolhida é **operação técnica clara**: azul profundo para confiança e contexto institucional, azul médio para ações e progresso, amarelo reservado para chamadas importantes, branco e cinza-azulado para reduzir ruído. O objetivo é fazer a ERP parecer uma ferramenta de operação técnica, não um conjunto de formulários administrativos.

A hierarquia deve seguir três níveis. Primeiro, o contexto do projeto: cliente, status, prazo e próxima ação. Segundo, o trabalho da equipe: timeline, tarefas e pendências. Terceiro, os dados detalhados: equipamentos, documentos, observações e protocolos. No celular, os cartões devem ficar em uma coluna, sem largura fixa e sem tabelas que empurrem a página para a direita.

A linguagem visual deve usar títulos curtos, subtítulos explicativos, estados com cores sem depender apenas de cor, botões com verbo e mensagens que expliquem o próximo passo. Exemplos: “Registrar exigência”, “Enviar para análise”, “Marcar documento como validado” e “Concluir tarefa”.

## Melhorias recomendadas para a próxima fase

### 1. Transformar projeto no eixo operacional

Propostas, ordens de serviço, documentos, tarefas, homologação, pós-venda e financeiro devem apontar para `engineering_projects.id`. Isso permite abrir o histórico completo sem procurar em módulos diferentes.

### 2. Criar um assistente de cadastro técnico

Em vez de exibir todos os campos em uma tela, usar quatro etapas: cliente e endereço; unidade consumidora e distribuidora; equipamentos e dimensionamento; documentos e revisão. A última etapa deve mostrar pendências antes de permitir o envio à engenharia.

### 3. Criar regras de pendência

Cada projeto deve calcular pendências automaticamente. Exemplos: falta fatura, titular não confirmado, UC vazia, potência sem equipamento, protocolo ausente após o envio ou prazo vencido. A pendência precisa aparecer no cartão do projeto e na timeline.

### 4. Padronizar documentos por distribuidora

A ERP deve manter uma matriz de documentos obrigatórios por distribuidora e modalidade. Isso evita que o engenheiro precise lembrar manualmente o que deve ser enviado para cada concessionária.

### 5. Melhorar o dashboard

O dashboard deve mostrar projetos por etapa, projetos próximos do prazo, exigências abertas, tempo médio por etapa, taxa de aprovação e tarefas atrasadas. O indicador mais importante não é somente quantidade de projetos; é o que está parado e por quê.

### 6. Conectar engenharia e instalação

Quando o projeto chegar a “Aprovado” ou “Homologado”, a ERP deve permitir gerar uma ordem de serviço já preenchida com cliente, endereço, equipamentos, potência e documentos. Isso reduz redigitação e divergência entre engenharia e campo.

### 7. Preparar comunicação externa

Depois da base interna estar estável, criar uma visão compartilhável para cliente ou integrador com status, documentos liberados, protocolo e mensagens. A visão externa deve esconder custos internos, notas comerciais e margem.

## Roadmap sugerido

**Fase 1 — concluída nesta entrega:** projeto central, cadastro técnico, cliente vinculado, status, timeline, documentos e tarefas.

**Fase 2 — próxima prioridade:** upload real de documentos, checklist obrigatório por distribuidora, pendências automáticas e vínculo direto com proposta/OS.

**Fase 3:** geração de documentos técnicos, notificações de prazo, permissões por projeto e portal compartilhável.

**Fase 4:** indicadores de produtividade, mapa de projetos, integração de protocolos e automações de pós-venda.
