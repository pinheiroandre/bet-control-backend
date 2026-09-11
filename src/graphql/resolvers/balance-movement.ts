import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Mutation, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { toIsoString } from '../../lib/toIsoString'
import { BalanceMovementService } from '../../services/balanceMovement'
import {
    CreateBalanceMovementInput,
    BalanceMovement,
    UpdateBalanceMovementInput
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

    @Query(() => BalanceMovement)
    async balanceMovement(
        @Arg('id', () => String) id: string
    ): Promise<BalanceMovement> {
        const record = await this.service.findById(id)

        return this.toGraphQL(record)
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

    @Mutation(() => BalanceMovement)
    async updateBalanceMovement(
        @Arg('input', () => UpdateBalanceMovementInput)
        input: UpdateBalanceMovementInput
    ): Promise<BalanceMovement> {
        const record = await this.service.update({
            ...input,
            date: input.date ? new Date(input.date) : undefined
        })

        return this.toGraphQL(record)
    }

    @Mutation(() => BalanceMovement)
    async deleteBalanceMovement(
        @Arg('id', () => String) id: string
    ): Promise<BalanceMovement> {
        const record = await this.service.delete(id)

        return this.toGraphQL(record)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toGraphQL(balanceMovement: any): BalanceMovement {
        return {
            id: balanceMovement.id,
            amount: balanceMovement.amount,
            bookmaker: balanceMovement.bookmaker,
            date: toIsoString(balanceMovement.date),
            type: balanceMovement.type,
            description: balanceMovement.description
        }
    }
}
