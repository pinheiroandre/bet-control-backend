import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'

interface CreateMonthClosingInput {
    referenceMonth: Date
}

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

// Normaliza qualquer data para o dia 1 do mês correspondente, usando os
// métodos UTC (getUTCFullYear/getUTCMonth) — evita bugs de fuso horário que
// aconteceriam usando getFullYear/getMonth (que dependem do horário local
// da máquina rodando o código).
function normalizeToFirstOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addMonths(date: Date, months: number): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
    )
}

@injectable()
export class MonthClosingService {
    private repository: PrismaOrTransaction['monthClosing']

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.repository = this.prisma.monthClosing
    }

    async create(input: CreateMonthClosingInput) {
        const referenceMonth = normalizeToFirstOfMonth(input.referenceMonth)

        const alreadyClosed = await this.repository.findFirst({
            where: { referenceMonth }
        })

        if (alreadyClosed) {
            throw new Error('Este mês já está fechado')
        }

        // O fechamento mais recente já registrado (se existir) — usado para
        // garantir que os meses sejam fechados em sequência, sem pular nenhum.
        const latest = await this.repository.findFirst({
            orderBy: { referenceMonth: 'desc' }
        })

        if (latest) {
            const expectedNext = addMonths(latest.referenceMonth, 1)

            if (referenceMonth.getTime() !== expectedNext.getTime()) {
                throw new Error(
                    'É necessário fechar os meses anteriores antes de fechar este'
                )
            }
        }

        // Só é possível fechar um mês que já terminou de verdade — nunca o
        // mês corrente (ainda em andamento) nem um mês futuro.
        const currentMonth = normalizeToFirstOfMonth(new Date())

        if (referenceMonth.getTime() >= currentMonth.getTime()) {
            throw new Error(
                'Não é possível fechar o mês atual antes que ele termine'
            )
        }

        return this.repository.create({ data: { referenceMonth } })
    }

    async delete(id: string) {
        const closing = await this.repository.findUnique({ where: { id } })

        if (!closing) {
            throw new Error('Fechamento não encontrado')
        }

        const latest = await this.repository.findFirst({
            orderBy: { referenceMonth: 'desc' }
        })

        // Só o fechamento mais recente pode ser desfeito — reabrir um mês no
        // meio da sequência deixaria "buracos" (meses fechados depois dele
        // continuariam existindo, sem sentido).
        if (latest && latest.id !== closing.id) {
            throw new Error('Só é possível reabrir o fechamento mais recente')
        }

        // Remove as fotos de saldo vinculadas a este fechamento ANTES dele
        // mesmo — sem isso, o Postgres recusaria a exclusão por violação de
        // chave estrangeira (BalanceClosing.monthClosingId aponta pra cá).
        await this.prisma.balanceClosing.deleteMany({
            where: { monthClosingId: id }
        })

        return this.repository.delete({ where: { id } })
    }

    async findById(id: string) {
        const closing = await this.repository.findUnique({ where: { id } })

        if (!closing) {
            throw new Error('Fechamento não encontrado')
        }

        return closing
    }

    async findAll() {
        return this.repository.findMany({ orderBy: { referenceMonth: 'desc' } })
    }
}
