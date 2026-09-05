import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'

interface CreateBalanceClosingInput {
    bookmakerId: string
    monthClosingId: string
    realBalance: number | Decimal
    bonusBalance: number | Decimal
}

interface FindAllBalanceClosingParams {
    bookmakerId?: string
    monthClosingId?: string
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class BalanceClosingService {
    private repository: PrismaOrTransaction['balanceClosing']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.balanceClosing
    }

    private async validateCreation(input: CreateBalanceClosingInput) {
        const bookmaker = await this.prisma.bookmaker.findUnique({
            where: { id: input.bookmakerId }
        })

        if (!bookmaker) {
            throw new Error('Casa de aposta não encontrada')
        }

        const monthClosing = await this.prisma.monthClosing.findUnique({
            where: { id: input.monthClosingId }
        })

        if (!monthClosing) {
            throw new Error('Fechamento não encontrado')
        }

        const alreadyExists = await this.repository.findFirst({
            where: {
                bookmakerId: input.bookmakerId,
                monthClosingId: input.monthClosingId
            }
        })

        if (alreadyExists) {
            throw new Error(
                'Este fechamento já possui um saldo registrado para esta casa de aposta'
            )
        }

        if (input.realBalance === undefined || input.realBalance === null) {
            throw new Error('Saldo real é obrigatório')
        }

        if (input.bonusBalance === undefined || input.bonusBalance === null) {
            throw new Error('Saldo de bônus é obrigatório')
        }
    }

    async create(input: CreateBalanceClosingInput) {
        await this.validateCreation(input)

        return this.repository.create({
            data: {
                bookmakerId: input.bookmakerId,
                monthClosingId: input.monthClosingId,
                realBalance: input.realBalance,
                bonusBalance: input.bonusBalance
            }
        })
    }

    async delete(id: string) {
        const closing = await this.repository.findUnique({ where: { id } })

        if (!closing) {
            throw new Error('Fechamento de saldo não encontrado')
        }

        return this.repository.delete({ where: { id } })
    }

    async findById(id: string) {
        const closing = await this.repository.findUnique({ where: { id } })

        if (!closing) {
            throw new Error('Fechamento de saldo não encontrado')
        }

        return closing
    }

    async findAll(params?: FindAllBalanceClosingParams) {
        return this.repository.findMany({
            where: {
                ...(params?.bookmakerId
                    ? { bookmakerId: params.bookmakerId }
                    : {}),
                ...(params?.monthClosingId
                    ? { monthClosingId: params.monthClosingId }
                    : {})
            }
        })
    }
}
