import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Mutation, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { BookmakerService } from '../../services/bookmaker'
import { Bookmaker, CreateBookmakerInput } from '../types/bookmaker'

@Resolver(() => Bookmaker)
@injectable()
export class BookmakerResolver {
    constructor(
        @inject(TYPES.BookmakerService)
        private readonly service: BookmakerService
    ) {}

    @Query(() => [Bookmaker])
    async bookmakers(
        @Arg('identifier', () => String, { nullable: true }) identifier?: string
    ): Promise<Bookmaker[]> {
        const records = await this.service.findAll({ identifier })

        return records.map(this.toGraphQL)
    }

    @Mutation(() => Bookmaker)
    async createBookmaker(
        @Arg('input', () => CreateBookmakerInput) input: CreateBookmakerInput
    ): Promise<Bookmaker> {
        const record = await this.service.create({
            ...input,
            initialBalanceDate: new Date(input.initialBalanceDate)
        })

        return this.toGraphQL(record)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toGraphQL(bookmaker: any): Bookmaker {
        return {
            id: bookmaker.id,
            description: bookmaker.description,
            initialBalance: Number(bookmaker.initialBalance),
            initialBalanceDate: bookmaker.initialBalanceDate
                .toISOString()
                .split('T')[0]
        }
    }
}
