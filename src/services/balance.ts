import 'reflect-metadata'
import { Prisma, PrismaClient } from '@prisma/client'
import { injectable, inject } from 'tsyringe'
import { TYPES } from '../di/types'
import { calculateBalance } from './balanceCalculator'

type PrismaOrTransaction = PrismaClient | Prisma.TransactionClient

@injectable()
export class BalanceService {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaOrTransaction
    ) {}

    // Saldo atual (real e de bônus) de uma bookmaker, calculado a partir do
    // último BalanceClosing (se existir) + movimentações desde então. Esse é
    // o método que a tela de resumo (Dashboard) vai consumir.
    async getBalance(bookmakerId: string, asOf?: Date) {
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
}
