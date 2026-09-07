import { BetStatus, BalanceMovementType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { Prisma, PrismaClient } from '@prisma/client'

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

interface CalculateBalanceOptions {
    bookmakerId: string
    isBonus: boolean
    // Considera só movimentações até essa data (inclusive) — default é agora.
    asOf?: Date
    // Exclui uma Bet ou BalanceMovement específica da soma — usado ao validar a
    // EDIÇÃO de um registro que já existe (senão o valor antigo dele seria
    // contado junto com o novo).
    excludeBetId?: string
    excludeBalanceMovementId?: string
}

function addMonths(date: Date, months: number): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
    )
}

// Calcula o saldo (real ou de bônus) de uma bookmaker num determinado
// momento. Usa o BalanceClosing mais recente ANTERIOR à data de referência
// como ponto de partida — em vez de somar o histórico inteiro desde sempre
// — e soma só as movimentações que aconteceram depois desse fechamento.
export async function calculateBalance(
    prisma: PrismaOrTransaction,
    options: CalculateBalanceOptions
) {
    const { bookmakerId, isBonus, excludeBetId, excludeBalanceMovementId } =
        options
    const asOf = options.asOf ?? new Date()

    const bookmaker = await prisma.bookmaker.findUnique({
        where: { id: bookmakerId }
    })

    if (!bookmaker) {
        throw new Error('Casa de aposta não encontrada')
    }

    const lastClosing = await prisma.balanceClosing.findFirst({
        where: { bookmakerId, monthClosing: { referenceMonth: { lt: asOf } } },
        orderBy: { monthClosing: { referenceMonth: 'desc' } },
        include: { monthClosing: true }
    })

    const baseline = lastClosing
        ? isBonus
            ? lastClosing.bonusBalance
            : lastClosing.realBalance
        : isBonus
          ? new Decimal(0)
          : bookmaker.initialBalance

    // Se existe um fechamento anterior, só contamos movimentações a partir do
    // mês seguinte a ele — o que veio antes já está "dentro" do baseline.
    const sinceDate = lastClosing
        ? addMonths(lastClosing.monthClosing.referenceMonth, 1)
        : undefined
    const dateFilter = { lte: asOf, ...(sinceDate ? { gte: sinceDate } : {}) }

    const betWhere = {
        bookmakerId,
        date: dateFilter,
        ...(excludeBetId ? { id: { not: excludeBetId } } : {})
    }

    const stakeSum = await prisma.bet.aggregate({
        where: { ...betWhere, stakeIsBonus: isBonus },
        _sum: { stake: true }
    })

    const payoutSum = await prisma.bet.aggregate({
        where: {
            ...betWhere,
            payoutIsBonus: isBonus,
            status: { not: BetStatus.PENDING }
        },
        _sum: { payout: true }
    })

    const totalStake = stakeSum._sum.stake ?? new Decimal(0)
    const totalPayout = payoutSum._sum.payout ?? new Decimal(0)

    const balanceMovementWhere = {
        bookmakerId,
        date: dateFilter,
        ...(excludeBalanceMovementId
            ? { id: { not: excludeBalanceMovementId } }
            : {})
    }

    if (isBonus) {
        const bonusCreditSum = await prisma.balanceMovement.aggregate({
            where: {
                ...balanceMovementWhere,
                type: BalanceMovementType.BONUS_CREDIT
            },
            _sum: { amount: true }
        })

        const totalBonusCredit = bonusCreditSum._sum.amount ?? new Decimal(0)

        return baseline
            .plus(totalBonusCredit)
            .minus(totalStake)
            .plus(totalPayout)
    }

    const depositSum = await prisma.balanceMovement.aggregate({
        where: { ...balanceMovementWhere, type: BalanceMovementType.DEPOSIT },
        _sum: { amount: true }
    })

    const withdrawalSum = await prisma.balanceMovement.aggregate({
        where: {
            ...balanceMovementWhere,
            type: BalanceMovementType.WITHDRAWAL
        },
        _sum: { amount: true }
    })

    const totalDeposit = depositSum._sum.amount ?? new Decimal(0)
    const totalWithdrawal = withdrawalSum._sum.amount ?? new Decimal(0)

    return baseline
        .plus(totalDeposit)
        .minus(totalWithdrawal)
        .minus(totalStake)
        .plus(totalPayout)
}
