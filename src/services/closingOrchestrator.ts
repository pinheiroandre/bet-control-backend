import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { calculateBalance } from './balanceCalculator'
import { BalanceClosingService } from './balanceClosing'
import { MonthClosingService } from './monthClosing'

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

function lastDayOfMonth(referenceMonth: Date): Date {
    // Dia 0 do mês seguinte = último dia do mês de referência.
    return new Date(
        Date.UTC(
            referenceMonth.getUTCFullYear(),
            referenceMonth.getUTCMonth() + 1,
            0
        )
    )
}

// Orquestra o fechamento de um mês: cria o MonthClosing (reaproveitando
// todas as validações de sequência/data já existentes) e, na sequência,
// tira uma "foto" do saldo (real e de bônus) de CADA bookmaker naquele
// momento, gravando um BalanceClosing para cada uma.
@injectable()
export class ClosingOrchestratorService {
    private monthClosingService: MonthClosingService
    private balanceClosingService: BalanceClosingService

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.monthClosingService = new MonthClosingService(this.prisma)
        this.balanceClosingService = new BalanceClosingService(this.prisma)
    }

    async closeMonth(referenceMonth: Date) {
        const monthClosing = await this.monthClosingService.create({
            referenceMonth
        })

        const asOf = lastDayOfMonth(monthClosing.referenceMonth)

        // Ignora bookmakers criadas DEPOIS do mês que está sendo fechado — não
        // faz sentido gerar uma "foto" de saldo para algo que ainda não existia
        const bookmakers = await this.prisma.bookmaker.findMany({
            where: { initialBalanceDate: { lte: asOf } }
        })

        const balanceClosings = []

        for (const bookmaker of bookmakers) {
            const [realBalance, bonusBalance] = await Promise.all([
                calculateBalance(this.prisma, {
                    bookmakerId: bookmaker.id,
                    isBonus: false,
                    asOf
                }),
                calculateBalance(this.prisma, {
                    bookmakerId: bookmaker.id,
                    isBonus: true,
                    asOf
                })
            ])

            balanceClosings.push(
                await this.balanceClosingService.create({
                    bookmakerId: bookmaker.id,
                    monthClosingId: monthClosing.id,
                    realBalance,
                    bonusBalance
                })
            )
        }

        return { monthClosing, balanceClosings }
    }

    // Desfaz um fechamento por completo — delega para MonthClosingService,
    // que já cuida de apagar as fotos de saldo vinculadas antes.
    async reopenMonth(monthClosingId: string) {
        return this.monthClosingService.delete(monthClosingId)
    }
}
