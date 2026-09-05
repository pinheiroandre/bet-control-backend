import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'

interface CreateBookmakerInput {
    description: string
    initialBalanceDate: Date
    initialBalance?: number | Decimal
}

interface UpdateBookmakerInput {
    id: string
    description?: string
    initialBalanceDate?: Date
    initialBalance?: number | Decimal
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class BookmakerService {
    private repository: PrismaOrTransaction['bookmaker']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.bookmaker
    }

    private validateRequired(input: CreateBookmakerInput) {
        if (!input.description || input.description.trim() === '') {
            throw new Error('Descrição é obrigatória')
        }

        if (!input.initialBalanceDate) {
            throw new Error('Data do saldo inicial é obrigatória')
        }
    }

    private async validateExistent(description: string, id?: string) {
        const existing = await this.repository.findFirst({
            where: {
                description: { equals: description, mode: 'insensitive' },
                ...(id ? { id: { not: id } } : {})
            }
        })

        if (existing) {
            throw new Error('Já existe uma casa de aposta com essa descrição')
        }
    }

    // Impede excluir uma bookmaker que já tem histórico — sem isso, o
    // Postgres recusaria com um erro cru de chave estrangeira.
    private async validateNoRelatedRecords(id: string) {
        const [betCount, transactionCount, balanceClosingCount] =
            await Promise.all([
                this.prisma.bet.count({ where: { bookmakerId: id } }),
                this.prisma.transaction.count({ where: { bookmakerId: id } }),
                this.prisma.balanceClosing.count({ where: { bookmakerId: id } })
            ])

        if (betCount > 0 || transactionCount > 0 || balanceClosingCount > 0) {
            throw new Error(
                'Não é possível excluir uma casa de aposta que já possui lançamentos'
            )
        }
    }

    async create(input: CreateBookmakerInput) {
        this.validateRequired(input)

        await this.validateExistent(input.description)

        return this.repository.create({
            data: {
                description: input.description,
                initialBalance: input.initialBalance ?? 0,
                initialBalanceDate: input.initialBalanceDate
            }
        })
    }

    async update(input: UpdateBookmakerInput) {
        const existendBookmaker = await this.findById(input.id)
        const toUpdated = { ...existendBookmaker, ...input }

        await this.validateExistent(toUpdated.description, toUpdated.id)

        this.validateRequired(toUpdated)

        return this.repository.update({
            where: { id: input.id },
            data: {
                description: input.description,
                initialBalance: input.initialBalance,
                initialBalanceDate: input.initialBalanceDate
            }
        })
    }

    async delete(id: string) {
        const existendBookmaker = await this.findById(id)

        await this.validateNoRelatedRecords(id)

        await this.repository.delete({ where: { id } })

        return existendBookmaker
    }

    async findById(id: string) {
        const bookmaker = await this.repository.findUnique({ where: { id } })

        if (!bookmaker) {
            throw new Error('Casa de aposta não encontrada')
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
