# Controle de Apostas — Backend

Backend em Node.js + TypeScript + GraphQL (Apollo Server) + Prisma, para controle pessoal de lançamentos de entrada e saída de apostas.

## Como rodar localmente

1. Instale as dependências:
   ```
   yarn install
   ```

2. Copie o arquivo de variáveis de ambiente e preencha com seus dados reais:
   ```
   cp .env.example .env
   ```
   - `DATABASE_URL`: pegue no painel do [Neon](https://neon.tech) depois de criar seu banco Postgres gratuito.
   - `AUTH0_DOMAIN` e `AUTH0_AUDIENCE`: pegue no painel do [Auth0](https://auth0.com) depois de criar sua aplicação e API.

3. Gere o cliente Prisma e rode a primeira migração (isso cria as tabelas no banco a partir do schema.prisma):
   ```
   yarn prisma:generate
   yarn prisma:migrate
   ```

4. Rode o servidor em modo desenvolvimento:
   ```
   yarn dev
   ```

5. Acesse `http://localhost:4000/graphql` no navegador. Deve abrir o Apollo Sandbox, onde você pode testar a query:
   ```graphql
   query {
     status
   }
   ```
   Se retornar "Backend rodando com sucesso! 🚀", está tudo certo.

## Estrutura de pastas

```
src/
  config/
    prisma.ts   -> instância única do cliente Prisma (acesso ao banco)
    auth.ts     -> validação de tokens JWT emitidos pelo Auth0
  graphql/
    typeDefs.ts -> definição do schema GraphQL (o que pode ser perguntado)
    resolvers.ts-> lógica que responde cada campo do schema
  index.ts      -> ponto de entrada: sobe o Express + Apollo Server
prisma/
  schema.prisma -> definição do banco de dados (modelos/tabelas)
```

## Próximos passos

- Definir a modelagem real dos "lançamentos" (campos, tipos, relações).
- Criar as queries e mutations de fato (criar, listar, editar, excluir lançamentos).
- Conectar a validação do Auth0 no `context` do Apollo Server (já preparado em `src/config/auth.ts`, falta plugar em `src/index.ts`).
