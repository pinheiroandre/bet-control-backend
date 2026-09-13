import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { container } from '../di/container'
import { BalanceResolver } from './resolvers/balance'
import { BalanceMovementResolver } from './resolvers/balance-movement'
import { BetResolver } from './resolvers/bet'
import { BookmakerResolver } from './resolvers/bookmaker'
import { TipsterResolver } from './resolvers/tipster'

// buildSchema lê os decorators (@Resolver, @Query, @Mutation, @Field, etc.)
// de cada classe listada em "resolvers" e monta o schema GraphQL a partir
// deles — é aqui que o "código vira schema", de fato.
//
// O "container" customizado diz ao type-graphql: "não instancie os
// resolvers você mesmo — peça ao tsyringe, que sabe injetar as
// dependências certas (como o BookmakerService) no construtor de cada um".
export function createSchema() {
    return buildSchema({
        resolvers: [
            BalanceResolver,
            BalanceMovementResolver,
            BetResolver,
            BookmakerResolver,
            TipsterResolver
        ],
        // Quando criar o resolver de Bet, basta somar ele nesse array.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        container: { get: cls => container.resolve(cls) }
    })
}
