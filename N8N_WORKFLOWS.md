# Workflows n8n - Automações PELG

Este documento lista todos os webhooks que precisam ser criados no n8n para substituir o backend NestJS.

## Configuração Base

- **URL Base do n8n**: `https://n8n.pelg.com.br/webhook/`
- **Banco de Dados**: PostgreSQL (mesmo do n8n)
- **Autenticação**: JWT do Supabase (validar header `Authorization: Bearer <token>`)

---

## 1. Auth (Autenticação)

### GET /api/auth/me
Retorna informações do usuário atual.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/auth/me`

**Lógica**:
1. Extrair token JWT do header Authorization
2. Decodificar JWT para obter `userId` e `email`
3. Buscar/criar usuário na tabela `users`
4. Retornar: `{ id, email, name }`

---

## 2. Social Accounts (Contas Sociais)

### GET /api/social-accounts
Lista todas as contas do usuário.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/social-accounts`

**Query**: Buscar na tabela `social_accounts` WHERE `userId` = usuário do JWT

---

### GET /api/social-accounts/:id
Retorna uma conta específica.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/social-accounts/:id`

---

### DELETE /api/social-accounts/:id
Remove uma conta.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/social-accounts/:id` (método DELETE)

---

## 3. Automations (Automações)

### GET /api/automations
Lista automações do usuário.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations`

---

### POST /api/automations
Cria nova automação.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations` (método POST)

**Body esperado**:
```json
{
  "name": "Nome da automação",
  "trigger": { "type": "new_comment", "platform": "instagram" },
  "actions": [{ "type": "reply", "message": "Obrigado!" }],
  "isActive": true
}
```

---

### GET /api/automations/:id
Retorna automação específica.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations/:id`

---

### PUT /api/automations/:id
Atualiza automação.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations/:id` (método PUT)

---

### DELETE /api/automations/:id
Remove automação.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations/:id` (método DELETE)

---

### PATCH /api/automations/:id/toggle
Ativa/desativa automação.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/automations/:id/toggle` (método PATCH)

---

## 4. Posts

### GET /api/posts
Lista posts de uma conta.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/posts`

**Query params**: `accountId`, `limit`, `offset`

---

### GET /api/posts/:id
Retorna post específico.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/posts/:id`

---

## 5. Stats (Estatísticas)

### GET /api/stats/dashboard
Retorna estatísticas do dashboard.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/stats/dashboard`

**Retorno esperado**:
```json
{
  "totalAutomations": 5,
  "activeAutomations": 3,
  "totalAccounts": 2,
  "executionsToday": 150,
  "executionsThisWeek": 1200
}
```

---

### GET /api/stats/automation/:id
Retorna estatísticas de uma automação.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/stats/automation/:id`

---

## 6. Logs

### GET /api/logs
Lista logs de execução.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/logs`

**Query params**: `automationId`, `startDate`, `endDate`, `limit`, `offset`

---

## 7. Facebook/Instagram OAuth

### GET /api/auth/facebook
Inicia fluxo OAuth do Facebook.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/auth/facebook`

**Lógica**:
1. Gerar URL de OAuth do Facebook com scopes necessários
2. Incluir state com userId e timestamp
3. Redirecionar para Facebook

---

### GET /api/auth/facebook/callback
Callback do OAuth.

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/auth/facebook/callback`

**Lógica**:
1. Trocar code por access_token
2. Obter long-lived token
3. Buscar páginas do usuário
4. Salvar contas na tabela `social_accounts`
5. Redirecionar para frontend

---

### GET /api/auth/facebook/url
Retorna URL de OAuth (para fluxo manual).

**Webhook n8n**: `https://n8n.pelg.com.br/webhook/auth/facebook/url`

---

## Tabelas do Banco de Dados

Criar as seguintes tabelas no PostgreSQL:

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### social_accounts
```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'instagram', 'youtube', 'tiktok'
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  account_username VARCHAR(255),
  profile_picture_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### automations
```sql
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### automation_logs
```sql
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id),
  status VARCHAR(50), -- 'success', 'error'
  trigger_data JSONB,
  action_results JSONB,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

### posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES social_accounts(id),
  platform_post_id VARCHAR(255),
  content TEXT,
  media_url TEXT,
  post_type VARCHAR(50),
  metrics JSONB,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```
