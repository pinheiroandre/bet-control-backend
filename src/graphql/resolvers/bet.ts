import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { Arg, Mutation, Query, Resolver } from 'type-graphql'
import { TYPES } from '../../di/types'
import { toIsoString } from '../../lib/toIsoString'
import { BetService } from '../../services/bet'
import { Bet, CreateBetInput, UpdateBetInput } from '../types/bet'

@Resolver(() => Bet)
@injectable()
export class BetResolver {
    constructor(
        @inject(TYPES.BetService)
        private readonly service: BetService
    ) {}

    @Query(() => [Bet])
    async bets(
        @Arg('identifier', () => String, { nullable: true }) identifier?: string
    ): Promise<Bet[]> {
        const records = await this.service.findAll({ identifier })

        return records.map(this.toGraphQL)
    }

    @Query(() => Bet)
    async bet(@Arg('id', () => String) id: string): Promise<Bet> {
        const record = await this.service.findById(id)

        return this.toGraphQL(record)
    }

    @Mutation(() => Bet)
    async createBet(
        @Arg('input', () => CreateBetInput) input: CreateBetInput
    ): Promise<Bet> {
        const record = await this.service.create(input)

        return this.toGraphQL(record)
    }

    @Mutation(() => Bet)
    async updateBet(
        @Arg('input', () => UpdateBetInput) input: UpdateBetInput
    ): Promise<Bet> {
        const record = await this.service.update(input)

        return this.toGraphQL(record)
    }

    @Mutation(() => Bet)
    async deleteBet(@Arg('id', () => String) id: string): Promise<Bet> {
        const record = await this.service.delete(id)

        return this.toGraphQL(record)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toGraphQL(bet: any): Bet {
        return {
            id: bet.id,
            description: bet.description,
            date: toIsoString(bet.date),
            stake: Number(bet.stake),
            payout: Number(bet.payout),
            odd: Number(bet.odd),
            status: bet.status,
            resolvedAt: toIsoString(bet.resolvedAt),
            stakeIsBonus: bet.stakeIsBonus,
            payoutIsBonus: bet.payoutIsBonus,
            observation: bet.observation,
            bookmaker: bet.bookmaker,
            tipster: bet.tipster
        }
    }
}
