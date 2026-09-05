import { describe, it, expect, afterAll, vi } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { ClosingOrchestratorService } from '../closingOrchestrator'
import { MonthClosingService } from '../monthClosing'

afterAll(async () => {
    await prisma.$disconnect()
})

// "Hoje" fixado em setembro/2026 — só nos testes que dependem de qual mês
// é o corrente/já terminado (mesma regra herdada do MonthClosingService).
const FROZEN_TODAY = new Date('2026-09-03')

describe('ClosingOrchestratorService (integration)', () => {
    describe('closeMonth', () => {
        it('should close the month and create a balance snapshot for every bookmaker', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new ClosingOrchestratorService(tx)

                    const result = await service.closeMonth(
                        new Date('2026-08-01')
                    )

                    expect(
                        result.monthClosing.referenceMonth
                            .toISOString()
                            .split('T')[0]
                    ).toBe('2026-08-01')
                    // Bet365 e Betano — as duas bookmakers do seed.
                    expect(result.balanceClosings).toHaveLength(2)

                    const bookmakerIds = result.balanceClosings.map(
                        closing => closing.bookmakerId
                    )

                    expect(new Set(bookmakerIds).size).toBe(2)
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("shouldn't take into account movements dated after the month being closed", async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new ClosingOrchestratorService(tx)

                    const result = await service.closeMonth(
                        new Date('2026-08-01')
                    )

                    // Betano tem initialBalance 200
                    const betanoClosing = result.balanceClosings.find(
                        ({ bookmakerId }) =>
                            bookmakerId ===
                            '0a84b9d7-cf33-4c2e-bf19-cd8400fea6b7'
                    )

                    expect(Number(betanoClosing?.realBalance)).toBe(200)
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("shouldn't close a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new ClosingOrchestratorService(tx)

                await expect(
                    service.closeMonth(new Date('2026-07-01'))
                ).rejects.toThrow('Este mês já está fechado')
            })
        })

        it("shouldn't close the current month before it ends", async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new ClosingOrchestratorService(tx)

                    await service.closeMonth(new Date('2026-08-01'))

                    await expect(
                        service.closeMonth(new Date('2026-09-01'))
                    ).rejects.toThrow(
                        'Não é possível fechar o mês atual antes que ele termine'
                    )
                })
            } finally {
                vi.useRealTimers()
            }
        })
    })

    describe('reopenMonth', () => {
        it('should reopen a month closing along with its balance snapshots', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new ClosingOrchestratorService(tx)
                    const monthClosingService = new MonthClosingService(tx)

                    const { monthClosing } = await service.closeMonth(
                        new Date('2026-08-01')
                    )

                    await service.reopenMonth(monthClosing.id)

                    await expect(
                        monthClosingService.findById(monthClosing.id)
                    ).rejects.toThrow('Fechamento não encontrado')

                    const remainingSnapshots = await tx.balanceClosing.findMany(
                        {
                            where: { monthClosingId: monthClosing.id }
                        }
                    )

                    expect(remainingSnapshots).toHaveLength(0)
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("shouldn't reopen a month closing that isn't the most recent one", async () => {
            await withRollback(async tx => {
                // Fecha agosto diretamente no banco (sem passar pelo service,
                // já que não precisamos testar a validação de sequência aqui de
                // novo).
                await tx.monthClosing.create({
                    data: { referenceMonth: new Date('2026-08-01') }
                })

                const service = new ClosingOrchestratorService(tx)

                await expect(
                    service.reopenMonth('7c2a8f3e-8b1a-4c9e-9d2a-1f4b6c7d8e9f')
                ).rejects.toThrow(
                    'Só é possível reabrir o fechamento mais recente'
                )
            })
        })

        it("shouldn't include a bookmaker created after the month being closed", async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new ClosingOrchestratorService(tx)

                    const futureBookmaker = await tx.bookmaker.create({
                        data: {
                            description: 'Sportingbet',
                            initialBalance: 0,
                            initialBalanceDate: new Date('2026-09-01') // depois de agosto
                        }
                    })

                    const result = await service.closeMonth(
                        new Date('2026-08-01')
                    )

                    const bookmakerIds = result.balanceClosings.map(
                        closing => closing.bookmakerId
                    )

                    expect(bookmakerIds).not.toContain(futureBookmaker.id)
                })
            } finally {
                vi.useRealTimers()
            }
        })
    })
})
