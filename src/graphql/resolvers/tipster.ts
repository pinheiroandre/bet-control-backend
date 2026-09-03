import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Mutation, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { TipsterService } from '../../services/tipster'
import { Tipster, CreateTipsterInput } from '../types/tipster'

@Resolver(() => Tipster)
@injectable()
export class TipsterResolver {
    constructor(
        @inject(TYPES.TipsterService)
        private readonly service: TipsterService
    ) {}

    @Query(() => [Tipster])
    async tipsters(
        @Arg('identifier', () => String, { nullable: true }) identifier?: string
    ): Promise<Tipster[]> {
        const records = await this.service.findAll({ identifier })

        return records.map(this.toGraphQL)
    }

    @Mutation(() => Tipster)
    async createTipster(
        @Arg('input', () => CreateTipsterInput) input: CreateTipsterInput
    ): Promise<Tipster> {
        const record = await this.service.create(input)

        return this.toGraphQL(record)
    }

    private toGraphQL(tipster: Tipster): Tipster {
        return {
            id: tipster.id,
            name: tipster.name
        }
    }
}
