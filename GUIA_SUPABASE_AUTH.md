# 📋 Guia de Configuração — Supabase Auth

Siga os passos abaixo para configurar a autenticação no Supabase. Não precisa entender o código — só copiar e colar.

---

## Passo 1: Configurar o arquivo `.env`

Na pasta do projeto (`rba---pipe`), crie um arquivo chamado `.env` (sem extensão) com o conteúdo:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON
```

> [!TIP]
> Você encontra esses valores no Supabase Dashboard → **Settings** → **API** → copie a **Project URL** e a **anon/public key**.

---

## Passo 2: Criar a tabela `profiles`

1. Abra o **Supabase Dashboard** do seu projeto
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New Query**
4. **Copie e cole** o SQL abaixo na caixa de texto:

```sql
-- 1. Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Assessor',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilitar segurança por linha
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Criar regras de acesso
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. Trigger para criar perfil automaticamente quando um usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, xp_id, name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'xp_id',
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'Assessor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

5. Clique em **Run** (botão verde)
6. Deve aparecer **"Success. No rows returned"** — isso está correto!

---

## Passo 3: Desativar confirmação de email

Como os emails são fictícios (`a69037@rba-pipe.local`), precisamos desativar a confirmação:

1. No menu lateral, vá em **Authentication** → **Providers**
2. Clique em **Email**
3. **Desmarque** a opção **"Confirm email"**
4. Clique em **Save**

---

## Passo 4: Criar os usuários (assessores)

Há duas formas de criar os usuários. Escolha a que preferir:

### Opção A — Via SQL Editor (mais rápido para todos de uma vez)

1. Vá em **SQL Editor** novamente
2. Cole e rode o SQL abaixo:

```sql
-- Criar todos os assessores de uma vez
-- Senha padrão de cada um = matrícula XP (ex: A69037)

-- IMPORTANTE: Esse script usa a função interna do Supabase para criar usuários.
-- Cada usuário terá o email: {matricula}@rba-pipe.local

-- Rubens Paiva (Gestor)
SELECT supabase_auth_admin.create_user(
  '{"email": "a69037@rba-pipe.local", "password": "A69037", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A69037", "name": "Rubens Paiva", "role": "Gestor"}}'::jsonb
);

-- Alexander Silva
SELECT supabase_auth_admin.create_user(
  '{"email": "a52987@rba-pipe.local", "password": "A52987", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A52987", "name": "Alexander Silva", "role": "Assessor"}}'::jsonb
);

-- Fernando Henrique
SELECT supabase_auth_admin.create_user(
  '{"email": "a91115@rba-pipe.local", "password": "A91115", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A91115", "name": "Fernando Henrique", "role": "Assessor"}}'::jsonb
);

-- Frederico Brandao
SELECT supabase_auth_admin.create_user(
  '{"email": "a96221@rba-pipe.local", "password": "A96221", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A96221", "name": "Frederico Brandao", "role": "Assessor"}}'::jsonb
);

-- Gabriel Darze
SELECT supabase_auth_admin.create_user(
  '{"email": "a44557@rba-pipe.local", "password": "A44557", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A44557", "name": "Gabriel Darze", "role": "Assessor"}}'::jsonb
);

-- Glaucia Medici
SELECT supabase_auth_admin.create_user(
  '{"email": "a70570@rba-pipe.local", "password": "A70570", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A70570", "name": "Glaucia Medici", "role": "Assessor Especialista"}}'::jsonb
);

-- Jose Augusto Camilo
SELECT supabase_auth_admin.create_user(
  '{"email": "a93161@rba-pipe.local", "password": "A93161", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A93161", "name": "Jose Augusto Camilo", "role": "Assessor"}}'::jsonb
);

-- Marcos Milet
SELECT supabase_auth_admin.create_user(
  '{"email": "a44625@rba-pipe.local", "password": "A44625", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A44625", "name": "Marcos Milet", "role": "Assessor"}}'::jsonb
);

-- Wallace Almeida
SELECT supabase_auth_admin.create_user(
  '{"email": "a45531@rba-pipe.local", "password": "A45531", "email_confirm": true, "raw_user_meta_data": {"xp_id": "A45531", "name": "Wallace Almeida", "role": "Assessor Senior"}}'::jsonb
);
```

> [!NOTE]
> Se o comando `supabase_auth_admin.create_user` não funcionar no seu plano, use a **Opção B** abaixo.

### Opção B — Via Dashboard (um por um)

1. No menu lateral, vá em **Authentication** → **Users**
2. Clique em **Add User** → **Create New User**
3. Preencha:
   - **Email**: `a69037@rba-pipe.local`
   - **Password**: `A69037`
   - Marque **Auto Confirm User**
4. Clique em **Create User**
5. Anote o **UUID** do usuário criado (aparece na lista)
6. Vá em **SQL Editor** e rode:

```sql
INSERT INTO public.profiles (id, xp_id, name, role)
VALUES ('COLE-O-UUID-AQUI', 'A69037', 'Rubens Paiva', 'Gestor');
```

7. Repita para cada assessor da lista:

| Matrícula | Nome | Role |
|-----------|------|------|
| A69037 | Rubens Paiva | Gestor |
| A52987 | Alexander Silva | Assessor |
| A91115 | Fernando Henrique | Assessor |
| A96221 | Frederico Brandao | Assessor |
| A44557 | Gabriel Darze | Assessor |
| A70570 | Glaucia Medici | Assessor Especialista |
| A93161 | Jose Augusto Camilo | Assessor |
| A44625 | Marcos Milet | Assessor |
| A45531 | Wallace Almeida | Assessor Senior |

---

## Passo 5: Testar

1. Rode o projeto localmente: `npm run dev`
2. Acesse o app no navegador
3. Faça login com:
   - **Matrícula**: `A69037`
   - **Senha**: `A69037`
4. Se entrar no Dashboard, está funcionando! 🎉

> [!IMPORTANT]
> A senha padrão de cada assessor é a própria matrícula XP. Cada um pode alterar sua senha depois pelo ícone de chave 🔑 no Dashboard.
