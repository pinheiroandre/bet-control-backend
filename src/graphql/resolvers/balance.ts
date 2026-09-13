import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { BalanceService } from '../../services/balance'
import { BookmakerBalance, Balance } from '../types/balance'

@Resolver(() => BookmakerBalance)
@injectable()
export class BalanceResolver {
    constructor(
        @inject(TYPES.BalanceService)
        private readonly service: BalanceService
    ) {}

    @Query(() => BookmakerBalance)
    async bookmakerBalance(
        @Arg('bookmakerId', () => String) bookmakerId: string
    ): Promise<BookmakerBalance> {
        const record = await this.service.getBalanceByBookmaker(bookmakerId)

        return {
            real: Number(record.real),
            bonus: Number(record.bonus)
        }
    }

    @Query(() => [Balance])
    async bookmakersBalance(): Promise<Balance[]> {
        const records = await this.service.getBalance()

        return records
    }
}
