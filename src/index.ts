import "reflect-metadata";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { createSchema } from "./graphql/schema";

async function startServer() {
  const app = express();
  const port = process.env.PORT || 4000;

  // buildSchema (dentro de createSchema) é assíncrono, por isso o "await" aqui.
  const schema = await createSchema();

  const apolloServer = new ApolloServer({
    schema,
  });

  await apolloServer.start();

  app.use(cors());
  app.use(express.json());

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // O context agora carrega só o que é "por requisição" (ex: o req
        // em si, e futuramente o usuário autenticado via Auth0). Os
        // serviços (BookmakerService, etc) NÃO viajam mais pelo context —
        // eles chegam nos resolvers via injeção de dependência (tsyringe),
        // igual ao seu AreaResolver de exemplo.
        return { req };
      },
    })
  );

  app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}/graphql`);
  });
}

startServer();
