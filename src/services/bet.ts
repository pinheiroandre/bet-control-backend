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
    private validateRequired(input: CreateBetInput) {
        if (!input.description || input.description.trim() === '') {
            throw new Error('Descrição é obrigatória')
        }
    }

    private normalizeBet(bet: NormalizeBet) {
        return {
            ...bet,
            payout: bet.payout ?? undefined,
            odd: bet.odd ?? undefined,
            observation: bet.observation ?? undefined,
            tipsterId: bet.tipsterId ?? undefined
        }
    }

    // Default services
    async create(input: CreateBetInput) {
        this.validateRequired(input)

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

        const bet = this.normalizeBet(toUpdated)

        this.validateRequired(bet)

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
