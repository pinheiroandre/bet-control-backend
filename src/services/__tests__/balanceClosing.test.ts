import { describe, it, expect, afterAll } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { BalanceClosingService } from '../balanceClosing'

afterAll(async () => {
    await prisma.$disconnect()
})

const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'

const BET365_ID = 'd91b64b7-a8c7-417e-bbbb-46e505cad17a'
const BETANO_ID = '0a84b9d7-cf33-4c2e-bf19-cd8400fea6b7'

const EXISTENT_CLOSE_MONTH = '7c2a8f3e-8b1a-4c9e-9d2a-1f4b6c7d8e9f'

// Reaproveita o baseline já existente no seed: as bookmakers Bet365/Betano
// e o fechamento de julho/2026 (ver prisma/fixtures/db.json).
describe('BalanceClosingService (integration)', () => {
    describe('create', () => {
        it('should create a balance closing for a bookmaker and month closing', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                const result = await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })

                expect(result.id).toBeDefined()
                expect(result.bookmakerId).toBe(BET365_ID)
                expect(result.monthClosingId).toBe(EXISTENT_CLOSE_MONTH)
                expect(Number(result.realBalance)).toBe(80)
                expect(Number(result.bonusBalance)).toBe(0)
            })
        })

        it("shouldn't create a balance closing for a bookmaker that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await expect(
                    service.create({
                        bookmakerId: INEXISTENT,
                        monthClosingId: EXISTENT_CLOSE_MONTH,
                        realBalance: 80,
                        bonusBalance: 0
                    })
                ).rejects.toThrow('Casa de aposta não encontrada')
            })
        })

        it("shouldn't create a balance closing for a month closing that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await expect(
                    service.create({
                        bookmakerId: BET365_ID,
                        monthClosingId: INEXISTENT,
                        realBalance: 80,
                        bonusBalance: 0
                    })
                ).rejects.toThrow('Fechamento não encontrado')
            })
        })

        it("shouldn't create a duplicate balance closing for the same bookmaker and month closing", async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })

                await expect(
                    service.create({
                        bookmakerId: BET365_ID,
                        monthClosingId: EXISTENT_CLOSE_MONTH,
                        realBalance: 90,
                        bonusBalance: 0
                    })
                ).rejects.toThrow(
                    'Este fechamento já possui um saldo registrado para esta casa de aposta'
                )
            })
        })
    })

    describe('delete', () => {
        it('should delete an existing balance closing', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                const created = await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })

                await service.delete(created.id)

                await expect(service.findById(created.id)).rejects.toThrow(
                    'Fechamento de saldo não encontrado'
                )
            })
        })

        it("shouldn't delete a balance closing that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await expect(service.delete(INEXISTENT)).rejects.toThrow(
                    'Fechamento de saldo não encontrado'
                )
            })
        })
    })

    describe('findById', () => {
        it('should find a balance closing by id', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                const created = await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })

                const result = await service.findById(created.id)

                expect(result.bookmakerId).toBe(BET365_ID)
            })
        })

        it("shouldn't find a balance closing that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await expect(service.findById(INEXISTENT)).rejects.toThrow(
                    'Fechamento de saldo não encontrado'
                )
            })
        })
    })

    describe('findAll', () => {
        it('should filter by bookmakerId', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })
                await service.create({
                    bookmakerId: BETANO_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 150,
                    bonusBalance: 0
                })

                const result = await service.findAll({ bookmakerId: BET365_ID })

                expect(result).toHaveLength(1)
                expect(result[0].bookmakerId).toBe(BET365_ID)
            })
        })

        it('should filter by monthClosingId', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })
                await service.create({
                    bookmakerId: BETANO_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 150,
                    bonusBalance: 0
                })

                const result = await service.findAll({
                    monthClosingId: EXISTENT_CLOSE_MONTH
                })
                const bookmakerIds = result.map(closing => closing.bookmakerId)

                expect(bookmakerIds).toEqual(
                    expect.arrayContaining([BET365_ID, BETANO_ID])
                )
            })
        })

        it('should return all balance closings when no filter is informed', async () => {
            await withRollback(async tx => {
                const service = new BalanceClosingService(tx)

                const created = await service.create({
                    bookmakerId: BET365_ID,
                    monthClosingId: EXISTENT_CLOSE_MONTH,
                    realBalance: 80,
                    bonusBalance: 0
                })

                const result = await service.findAll()
                const ids = result.map(closing => closing.id)

                expect(ids).toContain(created.id)
            })
        })
    })
})
