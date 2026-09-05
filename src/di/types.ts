// Cada "token" identifica uma dependência de forma única para o tsyringe.
// Usamos Symbol (em vez de string) para evitar colisão acidental de nomes.
export const TYPES = {
    PrismaClient: Symbol.for('PrismaClient'),
    BookmakerService: Symbol.for('BookmakerService'),
    TipsterService: Symbol.for('TipsterService'),
    MonthClosingService: Symbol.for('MonthClosingService'),
    BalanceClosingService: Symbol.for('BalanceClosingService'),
    TransactionService: Symbol.for('TransactionService'),
    BalanceService: Symbol.for('BalanceService'),
    ClosingOrchestratorService: Symbol.for('ClosingOrchestratorService')
}
