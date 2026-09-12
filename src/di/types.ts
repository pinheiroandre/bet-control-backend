// Cada "token" identifica uma dependência de forma única para o tsyringe.
// Usamos Symbol (em vez de string) para evitar colisão acidental de nomes.
export const TYPES = {
    BalanceClosingService: Symbol.for('BalanceClosingService'),
    BalanceMovementService: Symbol.for('BalanceMovement'),
    BalanceService: Symbol.for('BalanceService'),
    BetService: Symbol.for('BetService'),
    BookmakerService: Symbol.for('BookmakerService'),
    ClosingOrchestratorService: Symbol.for('ClosingOrchestratorService'),
    MonthClosingService: Symbol.for('MonthClosingService'),
    PrismaClient: Symbol.for('PrismaClient'),
    TipsterService: Symbol.for('TipsterService')
}
