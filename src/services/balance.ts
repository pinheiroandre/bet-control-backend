import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { Balance } from '../graphql/types/balance'
import { calculateBalance } from './balanceCalculator'
import { BookmakerService } from './bookmaker'

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class BalanceService {
    private bookmakerService: BookmakerService

    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {
        this.bookmakerService = new BookmakerService(this.prisma)
    }

    // Saldo atual (real e de bônus) de uma bookmaker, calculado a partir do
    // último BalanceClosing (se existir) + movimentações desde então. Esse é
    // o método que a tela de resumo (Dashboard) vai consumir.
    async getBalanceByBookmaker(bookmakerId: string, asOf?: Date) {
        const [real, bonus] = await Promise.all([
            calculateBalance(this.prisma, {
                bookmakerId,
                isBonus: false,
                asOf
            }),
            calculateBalance(this.prisma, { bookmakerId, isBonus: true, asOf })
        ])

        return { real, bonus }
    }

    // Saldo atual (real e de bônus) de uma bookmaker, calculado a partir do
    // último BalanceClosing (se existir) + movimentações desde então. Esse é
    // o método que a tela de resumo (Dashboard) vai consumir.
    async getBalance(asOf?: Date) {
        const bookmakers = await this.bookmakerService.findAll()
        const bookmakersBalance: Balance[] = []

        for (const bookmaker of bookmakers) {
            const { id: bookmakerId } = bookmaker

            const [real, bonus] = await Promise.all([
                calculateBalance(this.prisma, {
                    bookmakerId,
                    isBonus: false,
                    asOf
                }),
                calculateBalance(this.prisma, {
                    bookmakerId,
                    isBonus: true,
                    asOf
                })
            ])

            bookmakersBalance.push({
                bookmaker,
                balance: { real: Number(real), bonus: Number(bonus) }
            })
        }

        return bookmakersBalance
    }
}
