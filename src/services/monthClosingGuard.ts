import type { Prisma, PrismaClient } from '@prisma/client'

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

function normalizeToFirstOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

// Garante que a data informada não caia num mês já fechado — usado por
// qualquer entidade que lança ou edita movimentações (Bet, Transaction).
// Compartilhado para não duplicar essa regra em cada service.
export async function assertMonthIsOpen(
    prisma: PrismaOrTransaction,
    date: Date
) {
    const normalized = normalizeToFirstOfMonth(date)

    const latestClosing = await prisma.monthClosing.findFirst({
        orderBy: { referenceMonth: 'desc' }
    })

    if (
        latestClosing &&
        normalized.getTime() <= latestClosing.referenceMonth.getTime()
    ) {
        throw new Error('Não é possível lançar ou editar em um mês já fechado')
    }
}
