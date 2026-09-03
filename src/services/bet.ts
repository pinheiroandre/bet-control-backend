import 'reflect-metadata'
import { BetStatus, Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { CreateBetInput, UpdateBetInput } from '../graphql/types/bet'

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

    private normalizeBet(bet: NormalizeBet) {
        const completeBet = {
            ...bet,
            payout: bet.payout ?? undefined,
            odd: bet.odd ?? undefined,
            observation: bet.observation ?? undefined,
            tipsterId: bet.tipsterId ?? undefined
        }

        const getPayout = () => {
            if (completeBet.status === BetStatus.VOID) {
                return completeBet.stake
            }

            return completeBet.payout
        }

        return {
            ...completeBet,
            payout: getPayout()
        }
    }

    // Default services
    async create(input: CreateBetInput) {
        this.validateCreation(input)

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

        const bet = this.normalizeBet(toUpdated)

        return this.repository.update({
            where: { id: input.id },
            data: bet
        })
    }

    async delete(id: string) {
        const existendBookmaker = await this.findById(id)

        await this.repository.delete({ where: { id } })

        return existendBookmaker
    }

    async findById(id: string) {
        const bookmaker = await this.repository.findUnique({
            where: { id }
        })

        if (!bookmaker) {
            throw new Error('Aposta não encontrada')
        }

        return bookmaker
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
