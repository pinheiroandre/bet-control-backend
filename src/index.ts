import 'reflect-metadata'
import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'
import express from 'express'
import { createSchema } from './graphql/schema'

async function startServer() {
    const app = express()
    const port = process.env.PORT || 4000

    const schema = await createSchema()

    const apolloServer = new ApolloServer({
        schema
    })

    await apolloServer.start()

    app.use(cors())
    app.use(express.json())

    app.use(
        '/graphql',
        expressMiddleware(apolloServer, {
            context: async ({ req }) => {
                return { req }
            }
        })
    )

    app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 Servidor rodando em http://localhost:${port}/graphql`)
    })
}

startServer()
