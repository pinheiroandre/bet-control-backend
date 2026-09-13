import { BalanceMovementType } from '@prisma/client'
import { describe, it, expect, afterAll } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { BalanceService } from '../balance'

afterAll(async () => {
    await prisma.$disconnect()
})

const ID_BET365 = 'd91b64b7-a8c7-417e-bbbb-46e505cad17a'

describe('BalanceService (integration)', () => {
    it('should return the initialBalance as real balance when there are no balance movements', async () => {
        await withRollback(async tx => {
            const service = new BalanceService(tx)

            const result = await service.getBalanceByBookmaker(ID_BET365)

            expect(Number(result.real)).toBe(100)
            expect(Number(result.bonus)).toBe(0)
        })
    })

    it("should reflect a pending bet's stake in the real balance", async () => {
        await withRollback(async tx => {
            const service = new BalanceService(tx)

            const result = await service.getBalanceByBookmaker(
                '0a84b9d7-cf33-4c2e-bf19-cd8400fea6b7'
            )

            expect(Number(result.real)).toBe(180)
        })
    })

    it('should reflect a deposit in the real balance', async () => {
        await withRollback(async tx => {
            const service = new BalanceService(tx)

            await tx.balanceMovement.create({
                data: {
                    type: BalanceMovementType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                }
            })

            const result = await service.getBalanceByBookmaker(ID_BET365)

            expect(Number(result.real)).toBe(150)
        })
    })

    it('should reflect a bonus credit in the bonus balance', async () => {
        await withRollback(async tx => {
            const service = new BalanceService(tx)

            await tx.balanceMovement.create({
                data: {
                    type: BalanceMovementType.BONUS_CREDIT,
                    amount: 30,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                }
            })

            const result = await service.getBalanceByBookmaker(ID_BET365)

            expect(Number(result.bonus)).toBe(30)
        })
    })

    it('should use the most recent BalanceClosing as the baseline instead of initialBalance', async () => {
        await withRollback(async tx => {
            const service = new BalanceService(tx)

            await tx.balanceClosing.create({
                data: {
                    bookmakerId: ID_BET365,
                    monthClosingId: '7c2a8f3e-8b1a-4c9e-9d2a-1f4b6c7d8e9f',
                    realBalance: 500,
                    bonusBalance: 10
                }
            })

            const result = await service.getBalanceByBookmaker(ID_BET365)

            expect(Number(result.real)).toBe(500)
            expect(Number(result.bonus)).toBe(10)
        })
    })
})
