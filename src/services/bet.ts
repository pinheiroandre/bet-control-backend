import 'reflect-metadata'
import { BetStatus, Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { CreateBetInput, UpdateBetInput } from '../graphql/types/bet'
import { calculateBalance } from './balanceCalculator'
import { assertMonthIsOpen } from './monthClosingGuard'

type NormalizeBet = {
    id?: string
    date: string
    resolvedAt?: string
    description: string
    stake: Decimal
    payout?: Decimal | null
    odd?: Decimal | null
    status?: BetStatus
    stakeIsBonus?: boolean
    payoutIsBonus?: boolean
    observation?: string | null
    bookmakerId: string
    tipsterId?: string | null
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class BetService {
    private repository: PrismaOrTransaction['bet']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.bet
    }

    // Auxiliar functions
    private validateCreation(input: CreateBetInput) {
        const zeroDecimal = new Decimal(0)
        const payout = input.payout || zeroDecimal

        if (!!input.payout && !input.status) {
            throw new Error(
                'O status da aposta é obrigatório quando possui retorno'
            )
        }

        if (payout > zeroDecimal && input.status === BetStatus.PENDING) {
            throw new Error(
                'O status da aposta não pode ser pendente quando possui retorno'
            )
        }

        if (payout > zeroDecimal && input.status === BetStatus.LOST) {
            throw new Error(
                'O status da aposta não pode ser perdido quando possui retorno'
            )
        }

        if (payout > zeroDecimal && input.status === BetStatus.VOID) {
            throw new Error(
                'Apostas anuladas não devem ter valor de pagamento informando pelo usuário'
            )
        }

        if (payout <= zeroDecimal && input.status === BetStatus.CASHED_OUT) {
            throw new Error(
                'Aposta do tipo cashout necessita de valor de pagamento'
            )
        }

        if (payout <= zeroDecimal && input.status === BetStatus.HALF_WON) {
            throw new Error(
                'Aposta do tipo meio ganha necessita de valor de pagamento'
            )
        }

        if (payout <= zeroDecimal && input.status === BetStatus.HALF_LOST) {
            throw new Error(
                'Aposta do tipo meio perdida necessita de valor de pagamento'
            )
        }
    }

    // Reaproveita o cálculo de saldo compartilhado (que já usa o
    // BalanceClosing mais recente como base, em vez de somar o histórico
    // inteiro sempre).
    private async validateBalance(
        input: {
            bookmakerId: string
            stake: Decimal
            stakeIsBonus?: boolean
            date: Date
        },
        excludeBetId?: string
    ) {
        const isBonus = !!input.stakeIsBonus
        const available = await calculateBalance(this.prisma, {
            bookmakerId: input.bookmakerId,
            isBonus,
            asOf: input.date,
            excludeBetId
        })

        if (new Decimal(input.stake).greaterThan(available)) {
            throw new Error(
                isBonus
                    ? 'Saldo de bonus insuficiente para essa aposta'
                    : 'Saldo insuficiente para essa aposta'
            )
        }
    }

    private normalizeBet(bet: NormalizeBet) {
        const completeBet = {
            id: bet.id,
            date: new Date(bet.date),
            resolvedAt: bet.resolvedAt,
            description: bet.description,
            stake: bet.stake,
            payout: bet.payout ?? undefined,
            odd: bet.odd ?? undefined,
            status: bet.status,
            stakeIsBonus: bet.stakeIsBonus,
            payoutIsBonus: bet.payoutIsBonus,
            observation: bet.observation ?? undefined,
            bookmakerId: bet.bookmakerId,
            tipsterId: !!bet.tipsterId ? bet.tipsterId : undefined
        }

        const getPayout = () => {
            if (completeBet.status === BetStatus.VOID) {
                return completeBet.stake
            }

            return completeBet.payout
        }

        const getPayoutIsBonus = () => {
            if (completeBet.status === BetStatus.VOID) {
                return completeBet.stakeIsBonus
            }

            return completeBet.payoutIsBonus
        }

        return {
            ...completeBet,
            payout: getPayout(),
            payoutIsBonus: getPayoutIsBonus()
        }
    }

    // Default services
    async create(input: CreateBetInput) {
        this.validateCreation(input)

        const date = new Date(input.date)

        await assertMonthIsOpen(this.prisma, date)

        await this.validateBalance({
            bookmakerId: input.bookmakerId,
            stake: input.stake,
            stakeIsBonus: input.stakeIsBonus,
            date
        })

        const bet = this.normalizeBet(input)

        return this.repository.create({ data: bet })
    }

    async update(input: UpdateBetInput) {
        const existendBookmaker = await this.findById(input.id)

        const getResolvedAt = () => {
            if (input.resolvedAt) {
                return input.resolvedAt
            }

            return existendBookmaker.resolvedAt
                ? existendBookmaker.resolvedAt.toISOString()
                : undefined
        }

        const toUpdated = {
            ...existendBookmaker,
            ...input,
            date: input.date
                ? input.date
                : existendBookmaker.date.toISOString(),
            resolvedAt: getResolvedAt()
        }

        // FIX-ME: Fix type because null is not undefined
        this.validateCreation(toUpdated as unknown as CreateBetInput)

        const date = new Date(toUpdated.date)

        await assertMonthIsOpen(this.prisma, date)

        await this.validateBalance(
            {
                bookmakerId: toUpdated.bookmakerId,
                stake: toUpdated.stake,
                stakeIsBonus: toUpdated.stakeIsBonus,
                date
            },
            input.id
        )

        const bet = this.normalizeBet(toUpdated)

        return this.repository.update({
            where: { id: input.id },
            data: bet
        })
    }

    async delete(id: string) {
        const existendBookmaker = await this.findById(id)

        await assertMonthIsOpen(this.prisma, existendBookmaker.date)

        await this.repository.delete({ where: { id } })

        return existendBookmaker
    }

    async findById(id: string) {
        const bet = await this.repository.findUnique({
            where: { id },
            include: {
                bookmaker: true,
                tipster: true
            }
        })

        if (!bet) {
            throw new Error('Aposta não encontrada')
        }

        return bet
    }

    async findAll(params?: { identifier?: string }) {
        return this.repository.findMany({
            where: params?.identifier
                ? {
                      description: {
                          contains: params.identifier,
                          mode: 'insensitive'
                      }
                  }
                : {}
        })
    }
}
