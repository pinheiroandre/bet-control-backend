import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";

async function startServer() {
  const app = express();
  const port = process.env.PORT || 4000;

  // O ApolloServer é o motor que interpreta as queries/mutations GraphQL
  // recebidas e as direciona para os resolvers corretos.
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // O Apollo precisa ser "iniciado" antes de ser conectado ao Express.
  await apolloServer.start();

  app.use(cors());
  app.use(express.json());

  // Conectamos o Apollo ao Express na rota /graphql.
  // Todo o tráfego GraphQL (queries e mutations) passa por essa única rota.
  app.use(
    "/graphql",
    // @ts-expect-error - tipagem do expressMiddleware ainda tem incompatibilidades conhecidas com Express 4
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Aqui, futuramente, vamos extrair e validar o token do Auth0
        // enviado pelo frontend no header Authorization, usando verifyToken().
        return { req };
      },
    })
  );

  app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}/graphql`);
  });
}

startServer();
