import { describe, it, expect, afterAll, vi } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { MonthClosingService } from '../monthClosing'

afterAll(async () => {
    await prisma.$disconnect()
})

const FROZEN_TODAY = new Date('2026-09-03')

const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'
const EXISTENT_CLOSE_MONTH = '7c2a8f3e-8b1a-4c9e-9d2a-1f4b6c7d8e9f'

describe('MonthClosingService (integration)', () => {
    describe('create', () => {
        it('should close the next sequential month', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new MonthClosingService(tx)

                    const result = await service.create({
                        referenceMonth: new Date('2026-08-01')
                    })

                    expect(result.id).toBeDefined()
                    expect(
                        result.referenceMonth.toISOString().split('T')[0]
                    ).toBe('2026-08-01')
                    expect(result.closedAt).toBeDefined()
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("should normalize a reference date that isn't the first day of the month", async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new MonthClosingService(tx)

                    const result = await service.create({
                        referenceMonth: new Date('2026-08-15')
                    })

                    expect(
                        result.referenceMonth.toISOString().split('T')[0]
                    ).toBe('2026-08-01')
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("shouldn't close a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                await expect(
                    service.create({ referenceMonth: new Date('2026-07-01') })
                ).rejects.toThrow('Este mês já está fechado')
            })
        })

        it("shouldn't close a month skipping months that are still open", async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                // Apenas julho está fechado no baseline — outubro pula agosto e
                // setembro, então deve ser rejeitado. Não depende da data real:
                // é sempre um "pulo" de meses, independente de quando o teste
                // roda.
                await expect(
                    service.create({ referenceMonth: new Date('2026-10-01') })
                ).rejects.toThrow(
                    'É necessário fechar os meses anteriores antes de fechar este'
                )
            })
        })

        it("shouldn't close the current month before it ends", async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    // Fecha agosto diretamente no banco, sem passar pelo
                    // service, para que setembro passe a ser o "próximo mês
                    // sequencial" — e então confirmar que, mesmo sendo
                    // sequencial, setembro não pode ser fechado por ainda ser o
                    // mês corrente (na data congelada).
                    await tx.monthClosing.create({
                        data: { referenceMonth: new Date('2026-08-01') }
                    })

                    const service = new MonthClosingService(tx)

                    await expect(
                        service.create({
                            referenceMonth: new Date('2026-09-01')
                        })
                    ).rejects.toThrow(
                        'Não é possível fechar o mês atual antes que ele termine'
                    )
                })
            } finally {
                vi.useRealTimers()
            }
        })
    })

    describe('delete (reopen)', () => {
        it('should reopen the most recent month closing', async () => {
            vi.useFakeTimers()
            vi.setSystemTime(FROZEN_TODAY)

            try {
                await withRollback(async tx => {
                    const service = new MonthClosingService(tx)
                    const august = await service.create({
                        referenceMonth: new Date('2026-08-01')
                    })

                    await service.delete(august.id)

                    await expect(service.findById(august.id)).rejects.toThrow(
                        'Fechamento não encontrado'
                    )
                })
            } finally {
                vi.useRealTimers()
            }
        })

        it("shouldn't reopen a month closing that isn't the most recent one", async () => {
            await withRollback(async tx => {
                // Fecha agosto diretamente no banco (não depende da data real,
                // já que não passamos pelo service.create aqui) — julho deixa
                // deser o fechamento mais recente e não pode mais ser reaberto.
                await tx.monthClosing.create({
                    data: { referenceMonth: new Date('2026-08-01') }
                })

                const service = new MonthClosingService(tx)

                await expect(
                    service.delete(EXISTENT_CLOSE_MONTH)
                ).rejects.toThrow(
                    'Só é possível reabrir o fechamento mais recente'
                )
            })
        })

        it("shouldn't reopen a month closing that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                await expect(service.delete(INEXISTENT)).rejects.toThrow(
                    'Fechamento não encontrado'
                )
            })
        })
    })

    describe('findById', () => {
        it('should find a month closing by id', async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                const result = await service.findById(EXISTENT_CLOSE_MONTH)

                expect(result.referenceMonth.toISOString().split('T')[0]).toBe(
                    '2026-07-01'
                )
            })
        })

        it("shouldn't find a month closing that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                await expect(service.findById(INEXISTENT)).rejects.toThrow(
                    'Fechamento não encontrado'
                )
            })
        })
    })

    describe('findAll', () => {
        it('should include the seeded month closing when listing all closings', async () => {
            await withRollback(async tx => {
                const service = new MonthClosingService(tx)

                const result = await service.findAll()
                const months = result.map(
                    closing =>
                        closing.referenceMonth.toISOString().split('T')[0]
                )

                expect(months).toContain('2026-07-01')
            })
        })
    })
})
