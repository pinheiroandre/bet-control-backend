import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'

interface CreateTipsterInput {
    name: string
}

interface UpdateTipsterInput {
    id: string
    name?: string
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class TipsterService {
    private repository: PrismaOrTransaction['tipster']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.tipster
    }

    // Auxiliar functions
    private validateRequired(input: CreateTipsterInput) {
        if (!input.name || input.name.trim() === '') {
            throw new Error('Nome é obrigatório')
        }
    }

    private async validateExistent(name: string, id?: string) {
        const existing = await this.repository.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                },
                ...(id ? { id: { not: id } } : {})
            }
        })

        if (existing) {
            throw new Error('Já existe um tipster com esse nome')
        }
    }

    // Impede excluir um tipster que já foi usado em alguma aposta — sem
    // isso, o Postgres recusaria com um erro cru de chave estrangeira.
    private async validateNoRelatedRecords(id: string) {
        const betCount = await this.prisma.bet.count({
            where: { tipsterId: id }
        })

        if (betCount > 0) {
            throw new Error(
                'Não é possível excluir um tipster que já possui apostas vinculadas'
            )
        }
    }

    // Default services
    async create(input: CreateTipsterInput) {
        this.validateRequired(input)

        await this.validateExistent(input.name)

        return this.repository.create({
            data: {
                name: input.name
            }
        })
    }

    async update(input: UpdateTipsterInput) {
        const existendTipster = await this.findById(input.id)
        const toUpdated = { ...existendTipster, ...input }

        await this.validateExistent(toUpdated.name, toUpdated.id)

        this.validateRequired(toUpdated)

        return this.repository.update({
            where: { id: input.id },
            data: {
                name: input.name
            }
        })
    }

    async delete(id: string) {
        const existendTipster = await this.findById(id)

        await this.validateNoRelatedRecords(id)

        await this.repository.delete({ where: { id } })

        return existendTipster
    }

    async findById(id: string) {
        const tipster = await this.repository.findUnique({
            where: { id }
        })

        if (!tipster) {
            throw new Error('Tipster não encontrado')
        }

        return tipster
    }

    async findAll(params?: { identifier?: string }) {
        return this.repository.findMany({
            where: params?.identifier
                ? { name: { contains: params.identifier, mode: 'insensitive' } }
                : {}
        })
    }
}
