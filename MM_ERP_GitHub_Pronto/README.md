# MM Energia Solar ERP

Sistema de gestão da MM Energia Solar, criado a partir do projeto Hostinger Horizons e preparado para evolução por GitHub, VS Code e deploy na Hostinger.

## Módulos atuais

- Dashboard ERP
- Financeiro
- Financeiro Marcos
- Precificação de kits
- Equipamentos
- Simulador tributário
- Site institucional e calculadora solar

## Requisitos

- Node.js conforme `.nvmrc`
- npm

## Primeiro uso

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

Frontend: `http://localhost:3000`

API: `http://localhost:8787`

## Produção

```bash
npm ci
npm run build
```

A versão do frontend é gerada em:

```text
dist/apps/web
```

## Segurança

Nunca envie arquivos `.env`, chaves privadas, senhas, tokens ou a pasta `node_modules` ao GitHub.

## Próximas etapas

1. Publicar este código no repositório `mm-energia-solar-erp`.
2. Conectar o repositório à Hostinger.
3. Configurar variáveis de ambiente no servidor.
4. Ativar autenticação e banco de dados.
5. Integrar o Assistente IA MM pelo backend, mantendo a chave da API fora do navegador.
