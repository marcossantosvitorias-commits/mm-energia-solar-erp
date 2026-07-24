# Publicação do PocketBase na Hostinger

Esta pasta publica o banco do MM ERP AI em um VPS com Docker e HTTPS automático.

## Pré-requisitos

- VPS Hostinger com Ubuntu e Docker/Docker Compose.
- Subdomínio `banco.mmenergiasolar.com.br` apontando por registro A para o IP do VPS.
- Portas 80 e 443 liberadas no firewall.
- Repositório privado clonado no VPS com uma chave SSH ou token autorizado.

## 1. Apontar o domínio

No DNS do domínio, crie:

- Tipo: `A`
- Nome: `banco`
- Aponta para: IP público do VPS
- TTL: padrão

Aguarde a propagação antes de iniciar o Caddy.

## 2. Entrar no VPS

```bash
ssh root@IP_DO_VPS
```

## 3. Clonar o repositório privado

```bash
apt update
apt install -y git openssl
cd /opt
git clone git@github.com:marcossantosvitorias-commits/mm-energia-solar-erp.git
cd mm-energia-solar-erp/MM_ERP_GitHub_Pronto/deploy/pocketbase
```

## 4. Criar as variáveis privadas

```bash
cp .env.example .env
CHAVE=$(openssl rand -hex 16)
sed -i "s/troque-por-uma-chave-aleatoria-de-32-caracteres/$CHAVE/" .env
chmod 600 .env
```

Confirme o arquivo:

```bash
cat .env
```

Nunca envie o arquivo `.env` para o GitHub.

## 5. Subir o banco

Em versões recentes:

```bash
docker compose up -d --build
```

Em instalações que usam o comando antigo:

```bash
docker-compose up -d --build
```

## 6. Verificar

```bash
docker ps
docker compose logs -f pocketbase
docker compose logs -f caddy
```

Endereços esperados:

- API: `https://banco.mmenergiasolar.com.br/api/`
- Administração: `https://banco.mmenergiasolar.com.br/_/`

## 7. Criar o primeiro superusuário

Substitua e-mail e senha:

```bash
docker compose exec pocketbase /pb/pocketbase superuser create admin@mmenergiasolar.com.br 'SENHA_FORTE'
```

Depois entre em:

```text
https://banco.mmenergiasolar.com.br/_/
```

## 8. Configurar o ERP web

Na variável de ambiente de produção do site:

```env
VITE_POCKETBASE_URL=https://banco.mmenergiasolar.com.br
```

Depois faça uma nova publicação do frontend.

## Atualizações futuras

```bash
cd /opt/mm-energia-solar-erp
git pull
cd MM_ERP_GitHub_Pronto/deploy/pocketbase
docker compose up -d --build
```

## Backup

O volume `pocketbase_data` contém o banco e arquivos. Também configure backups pelo painel do PocketBase em `Settings > Backups`, preferencialmente para armazenamento externo compatível com S3.

Para inspecionar volumes:

```bash
docker volume ls | grep pocketbase
```

## Segurança

- Não exponha diretamente a porta 8090.
- Use senha forte e exclusiva para o superusuário.
- Ative MFA e limite IPs de superusuários quando possível.
- Configure SMTP para recuperação de senha.
- Mantenha o VPS, Docker e PocketBase atualizados.
