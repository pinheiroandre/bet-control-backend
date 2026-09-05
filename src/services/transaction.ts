import 'reflect-metadata'
import { Prisma, PrismaClient, TransactionType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { calculateBalance } from './balanceCalculator'
import { assertMonthIsOpen } from './monthClosingGuard'

interface CreateTransactionInput {
    type: TransactionType
    amount: number | Decimal
    date: Date
    description?: string
    bookmakerId: string
}

interface UpdateTransactionInput {
    id: string
    type?: TransactionType
    amount?: number | Decimal
    date?: Date
    description?: string
}

interface FindAllTransactionParams {
    bookmakerId?: string
    type?: TransactionType
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class TransactionService {
    private repository: PrismaOrTransaction['transaction']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.transaction
    }

    private async validateBookmaker(bookmakerId: string) {
        const bookmaker = await this.prisma.bookmaker.findUnique({
            where: { id: bookmakerId }
        })

        if (!bookmaker) {
            throw new Error('Casa de aposta não encontrada')
        }
    }

    private validateAmount(amount: number | Decimal | undefined) {
        if (amount === undefined || amount === null) {
            throw new Error('Valor da transação é obrigatório')
        }

        if (new Decimal(amount).lessThanOrEqualTo(0)) {
            throw new Error('Valor da transação deve ser maior que zero')
        }
    }

    private validateDate(date: Date | undefined) {
        if (!date) {
            throw new Error('Data da transação é obrigatória')
        }
    }

    // Um SAQUE não pode deixar o saldo real negativo — reaproveita o mesmo
    // cálculo de saldo usado para validar apostas.
    private async validateWithdrawalBalance(
        bookmakerId: string,
        amount: number | Decimal,
        date: Date,
        excludeTransactionId?: string
    ) {
        const available = await calculateBalance(this.prisma, {
            bookmakerId,
            isBonus: false,
            asOf: date,
            excludeTransactionId
        })

        if (new Decimal(amount).greaterThan(available)) {
            throw new Error('Saldo insuficiente para esse saque')
        }
    }

    async create(input: CreateTransactionInput) {
        await this.validateBookmaker(input.bookmakerId)
        this.validateAmount(input.amount)
        this.validateDate(input.date)
        await assertMonthIsOpen(this.prisma, input.date)

        if (input.type === TransactionType.WITHDRAWAL) {
            await this.validateWithdrawalBalance(
                input.bookmakerId,
                input.amount,
                input.date
            )
        }

        return this.repository.create({
            data: {
                type: input.type,
                amount: input.amount,
                date: input.date,
                description: input.description,
                bookmakerId: input.bookmakerId
            }
        })
    }

    async update(input: UpdateTransactionInput) {
        const existing = await this.findById(input.id)
        const toUpdated = { ...existing, ...input }

        this.validateAmount(toUpdated.amount)
        this.validateDate(toUpdated.date)
        await assertMonthIsOpen(this.prisma, toUpdated.date)

        if (toUpdated.type === TransactionType.WITHDRAWAL) {
            await this.validateWithdrawalBalance(
                toUpdated.bookmakerId,
                toUpdated.amount,
                toUpdated.date,
                input.id
            )
        }

        return this.repository.update({
            where: { id: input.id },
            data: {
                type: input.type,
                amount: input.amount,
                date: input.date,
                description: input.description
            }
        })
    }

    async delete(id: string) {
        const existing = await this.findById(id)

        await assertMonthIsOpen(this.prisma, existing.date)

        await this.repository.delete({ where: { id } })

        return existing
    }

    async findById(id: string) {
        const transaction = await this.repository.findUnique({ where: { id } })

        if (!transaction) {
            throw new Error('Transação não encontrada')
        }

        return transaction
    }

    async findAll(params?: FindAllTransactionParams) {
        return this.repository.findMany({
            where: {
                ...(params?.bookmakerId
                    ? { bookmakerId: params.bookmakerId }
                    : {}),
                ...(params?.type ? { type: params.type } : {})
            }
        })
    }
}
