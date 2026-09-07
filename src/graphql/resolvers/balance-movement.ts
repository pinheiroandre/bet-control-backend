import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Mutation, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { BalanceMovementService } from '../../services/balanceMovement'
import {
    CreateBalanceMovementInput,
    BalanceMovement
} from '../types/balance-movement'

@Resolver(() => BalanceMovement)
@injectable()
export class BalanceMovementResolver {
    constructor(
        @inject(TYPES.BalanceMovementService)
        private readonly service: BalanceMovementService
    ) {}

    @Query(() => [BalanceMovement])
    async balanceMovements(): Promise<BalanceMovement[]> {
        const records = await this.service.findAll()

        return records.map(this.toGraphQL)
    }

    @Mutation(() => BalanceMovement)
    async createBalanceMovement(
        @Arg('input', () => CreateBalanceMovementInput)
        input: CreateBalanceMovementInput
    ): Promise<BalanceMovement> {
        const record = await this.service.create({
            ...input,
            date: new Date(input.date)
        })

        return this.toGraphQL(record)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toGraphQL(balanceMovement: any): BalanceMovement {
        return {
            id: balanceMovement.id,
            amount: balanceMovement.amount,
            bookmaker: balanceMovement.bookmaker,
            date: balanceMovement.date,
            type: balanceMovement.type,
            description: balanceMovement.description
        }
    }
}
