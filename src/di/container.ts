import 'reflect-metadata'
import { PrismaClient } from '@prisma/client'
import { container } from 'tsyringe'
import { BalanceService } from '../services/balance'
import { BalanceClosingService } from '../services/balanceClosing'
import { BalanceMovementService } from '../services/balanceMovement'
import { BetService } from '../services/bet'
import { BookmakerService } from '../services/bookmaker'
import { ClosingOrchestratorService } from '../services/closingOrchestrator'
import { MonthClosingService } from '../services/monthClosing'
import { TipsterService } from '../services/tipster'
import { TYPES } from './types'

// Uma única instância de PrismaClient para toda a aplicação.
const prisma = new PrismaClient()

container.register(TYPES.PrismaClient, { useValue: prisma })

// Registramos a classe (não uma instância pronta) — o tsyringe cria a
// instância sozinho quando alguém pedir TYPES.BookmakerService, injetando
// automaticamente o que o construtor de BookmakerService pedir (o Prisma
// registrado acima).
container.register(TYPES.BalanceClosingService, {
    useClass: BalanceClosingService
})
container.register(TYPES.BalanceMovementService, {
    useClass: BalanceMovementService
})
container.register(TYPES.BalanceService, { useClass: BalanceService })
container.register(TYPES.BetService, { useClass: BetService })
container.register(TYPES.BookmakerService, { useClass: BookmakerService })
container.register(TYPES.ClosingOrchestratorService, {
    useClass: ClosingOrchestratorService
})
container.register(TYPES.MonthClosingService, { useClass: MonthClosingService })
container.register(TYPES.TipsterService, { useClass: TipsterService })

export { container }
