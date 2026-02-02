# Guia de Migração - Adicionar campos organization e projectType

## Problema
O banco de dados não tem as colunas `organization` e `project_type` que foram adicionadas ao schema, causando erros ao fazer login ou criar usuários.

## Solução: Executar SQL Manualmente

### Opção A: Via Neon Console (Recomendado)

1. Acesse o [Neon Console](https://console.neon.tech)
2. Selecione seu projeto
3. Vá para a aba "SQL Editor"
4. Execute o seguinte SQL:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization VARCHAR,
ADD COLUMN IF NOT EXISTS project_type VARCHAR;
```

5. Clique em "Run" para executar

### Opção B: Via psql (linha de comando)

Se você tem o `psql` instalado e a `DATABASE_URL` configurada:

```bash
psql $DATABASE_URL -f migration_add_organization_project_type.sql
```

### Opção C: Via Docker (se o projeto estiver rodando)

Se você estiver usando Docker, pode executar o SQL dentro do container do backend:

```bash
docker exec -i translation-helper-backend psql $DATABASE_URL < migration_add_organization_project_type.sql
```

## Verificação

Após executar a migração, você pode verificar se as colunas foram adicionadas:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('organization', 'project_type');
```

## Notas Importantes

- ✅ As colunas são opcionais (nullable), então usuários existentes não serão afetados
- ✅ Novos registros poderão incluir esses campos
- ✅ O erro de login será resolvido após a migração

## Alternativa: Instalar Node.js/npm

Se preferir usar `npm run db:push` no futuro:

1. Baixe e instale o Node.js de [nodejs.org](https://nodejs.org/)
2. Reinicie o PowerShell
3. Execute: `npm run db:push`
