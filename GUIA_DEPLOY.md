# 🚀 Guia de Deploy — RBA Pipe
## Hostinger (Frontend) + Supabase (Banco de Dados)

---

## 1. Configurar o Supabase (Banco de Dados)

### 1.1 Criar conta e projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New Project"** e preencha nome, senha do banco e região (escolha **South America - São Paulo** para menor latência)
3. Aguarde a criação (~2 min)

### 1.2 Criar as tabelas

Acesse **SQL Editor** no painel do Supabase e execute o SQL abaixo:

```sql
-- Tabela de assessores
CREATE TABLE advisors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Assessor'
);

-- Tabela de leads
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'lead',
  source TEXT NOT NULL DEFAULT 'indicacao',
  last_activity TEXT,
  products JSONB DEFAULT '[]',
  closed_data JSONB,
  notes TEXT,
  scheduled_for TEXT,
  is_qualified_opening BOOLEAN DEFAULT false
);

-- Tabela de atividades
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  lead_id TEXT
);

-- Índices para performance
CREATE INDEX idx_leads_advisor ON leads(advisor_id);
CREATE INDEX idx_activities_advisor ON activities(advisor_id);
```

### 1.3 Configurar RLS (Row Level Security)

> [!IMPORTANT]
> Para a aplicação funcionar com a **anon key**, você precisa habilitar RLS e criar políticas de acesso.

Execute no **SQL Editor**:

```sql
-- Habilitar RLS
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (acesso total via anon key)
-- Em produção, restrinja conforme necessidade
CREATE POLICY "Allow all on advisors" ON advisors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activities" ON activities FOR ALL USING (true) WITH CHECK (true);
```

### 1.4 Obter as credenciais

No painel do Supabase, vá em **Settings → API** e copie:

| Campo | Onde encontrar |
|-------|---------------|
| **Project URL** | `https://xxxxx.supabase.co` |
| **Anon Public Key** | `eyJhbGciOi...` (uma string longa) |

---

## 2. Criar o arquivo `.env` no projeto

Na raiz do projeto (`rba---pipe/`), crie o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> [!CAUTION]
> **Nunca suba o `.env` para o GitHub!** O `.gitignore` já está configurado para ignorá-lo.

---

## 3. Gerar o Build de Produção

No terminal, dentro da pasta do projeto:

```bash
npm run build
```

Isso vai gerar a pasta `dist/` com os arquivos estáticos prontos para deploy.

> [!NOTE]
> As variáveis de ambiente `VITE_*` são embutidas no build no momento da compilação. Então **você precisa ter o`.env` configurado ANTES de rodar o build**.

---

## 4. Deploy na Hostinger

### Opção A — Upload Manual (Hosting estático / Shared Hosting)

1. Acesse o **hPanel** da Hostinger
2. Vá em **Gerenciador de Arquivos** (ou use FTP/SFTP)
3. Navegue até a pasta `public_html/`
4. **Apague** o conteúdo existente de `public_html/`
5. Faça **upload de todo o conteúdo** da pasta `dist/`:
   - `index.html`
   - Pasta `assets/` (com JS e CSS)
6. Pronto! O site estará acessível pelo seu domínio

### Opção B — Deploy via Git (se a Hostinger suportar no seu plano)

1. No hPanel, vá em **Avançado → Git**
2. Clone seu repositório do GitHub
3. Configure o build:
   - **Branch**: `main`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`

### Configurar redirecionamento SPA

> [!IMPORTANT]
> Como a aplicação é uma SPA (Single Page Application), você precisa redirecionar todas as rotas para `index.html`.

Crie um arquivo `.htaccess` na pasta `public_html/` com:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## 5. Checklist Final

- [ ] Projeto criado no Supabase com région São Paulo
- [ ] 3 tabelas criadas: `advisors`, `leads`, `activities`
- [ ] RLS habilitado com políticas configuradas
- [ ] Arquivo `.env` criado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Build gerado com `npm run build` (após configurar `.env`)
- [ ] Conteúdo da pasta `dist/` enviado para `public_html/` na Hostinger
- [ ] Arquivo `.htaccess` criado para redirecionamento SPA
- [ ] Testar o site no domínio e verificar se os dados carregam do Supabase

---

## ⚠️ Considerações de Segurança

> [!WARNING]
> As credenciais de login (arquivo `credentials.ts`) estão **hardcoded no frontend**. Isso significa que qualquer pessoa que inspecionar o código JavaScript no navegador poderá ver as senhas. Para uma versão de produção segura, considere:
> - Migrar a autenticação para o **Supabase Auth**
> - Armazenar credenciais no banco de dados com senhas hasheadas
> - Implementar autenticação via API com tokens JWT
