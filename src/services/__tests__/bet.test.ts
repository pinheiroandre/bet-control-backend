import { Decimal } from '@prisma/client/runtime/library'
import { describe, it, expect, afterAll } from 'vitest'
import BetStatus from '../../graphql/types/enum/bet-status'
import { withRollback, prisma } from '../../test/withRollback'
import { BetService } from '../bet'

afterAll(async () => {
    await prisma.$disconnect()
})

const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'
const BET365_ID = 'd91b64b7-a8c7-417e-bbbb-46e505cad17a'
const PEI_ID = '2e40023f-cdb5-4378-89e2-5c8750c298b1'
const EXISTENT_BET = 'd0451181-5d23-4257-a133-984716040fca'

const NEW_BET = {
    description: 'Atlético Mineiro vencer',
    date: new Date('2026-09-01').toISOString(),
    stake: new Decimal(5),
    odd: new Decimal(3.9),
    observation: 'Jogo estava chamando para a virada',
    bookmakerId: BET365_ID
}

describe('BetService (integration)', () => {
    describe('create', () => {
        it('should create a simple bet and see the default fields', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.create(NEW_BET)

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(result.payout).toBeNull()
                expect(result.status).toBe('PENDING')
                expect(result.stakeIsBonus).toBeFalsy()
                expect(result.payoutIsBonus).toBeFalsy()
            })
        })

        it('should create a bet with payout and status won', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(25.16)
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    payout,
                    status: BetStatus.WON
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(25.16)
                expect(result.status).toBe('WON')
            })
        })

        it('should create a bet with the stake marked as bonus', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await tx.balanceMovement.create({
                    data: {
                        type: 'BONUS_CREDIT',
                        amount: 50,
                        date: new Date('2026-08-01'),
                        bookmakerId: BET365_ID
                    }
                })

                const result = await service.create({
                    ...NEW_BET,
                    stakeIsBonus: true
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(result.stakeIsBonus).toBeTruthy()
            })
        })

        it('should create a bet with a tipster indicator', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    tipsterId: PEI_ID
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(result.tipsterId).toBe(PEI_ID)
            })
        })

        it('should create a bet with status lost', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(0)
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    payout,
                    status: BetStatus.LOST
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(0)
                expect(result.status).toBe('LOST')
            })
        })

        it('should create a bet with status void, and payout is automatically set to the stake', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    status: BetStatus.VOID
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(Number(NEW_BET.stake))
                expect(result.status).toBe('VOID')
            })
        })

        it('should create a bet with status cashed_out', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(30)
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    payout,
                    status: BetStatus.CASHED_OUT
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(30)
                expect(result.status).toBe('CASHED_OUT')
            })
        })

        it('should create a bet with status half_won', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(30)
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    payout,
                    status: BetStatus.HALF_WON
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(30)
                expect(result.status).toBe('HALF_WON')
            })
        })

        it('should create a bet with status half_lost', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(30)
                const service = new BetService(tx)

                const result = await service.create({
                    ...NEW_BET,
                    payout,
                    status: BetStatus.HALF_LOST
                })

                expect(result.id).toBeDefined()
                expect(result.description).toBe(NEW_BET.description)
                expect(Number(result.payout)).toBe(30)
                expect(result.status).toBe('HALF_LOST')
            })
        })

        it("shouldn't create a bet without balance for the bookmaker", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, stake: new Decimal(1000) })
                ).rejects.toThrow('Saldo insuficiente para essa aposta')
            })
        })

        it("shouldn't create a bet for a bookmaker that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, bookmakerId: INEXISTENT })
                ).rejects.toThrowError('Casa de aposta não encontrada')
            })
        })

        it("shouldn't create a bet for a tipster that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, tipsterId: INEXISTENT })
                ).rejects.toThrowError('bet_tipster_fkey (index)')
            })
        })

        it("shouldn't create a bet without bonus balance for the bookmaker", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({
                        ...NEW_BET,
                        stake: new Decimal(20),
                        stakeIsBonus: true
                    })
                ).rejects.toThrow(
                    'Saldo de bonus insuficiente para essa aposta'
                )
            })
        })

        it("shouldn't create a bet with payout without an input status", async () => {
            await withRollback(async tx => {
                const payout = new Decimal(25.16)
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, payout })
                ).rejects.toThrow(
                    'O status da aposta é obrigatório quando possui retorno'
                )
            })
        })

        it("shouldn't create a bet with payout and status pending", async () => {
            await withRollback(async tx => {
                const payout = new Decimal(25.16)
                const service = new BetService(tx)

                await expect(
                    service.create({
                        ...NEW_BET,
                        payout,
                        status: BetStatus.PENDING
                    })
                ).rejects.toThrow(
                    'O status da aposta não pode ser pendente quando possui retorno'
                )
            })
        })

        it("shouldn't create a bet with status lost when it has a payout", async () => {
            await withRollback(async tx => {
                const payout = new Decimal(20)
                const service = new BetService(tx)

                await expect(
                    service.create({
                        ...NEW_BET,
                        payout,
                        status: BetStatus.LOST
                    })
                ).rejects.toThrow(
                    'O status da aposta não pode ser perdido quando possui retorno'
                )
            })
        })

        it("shouldn't create a bet with status void informing a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({
                        ...NEW_BET,
                        status: BetStatus.VOID,
                        payout: new Decimal(5)
                    })
                ).rejects.toThrow(
                    'Apostas anuladas não devem ter valor de pagamento informando pelo usuário'
                )
            })
        })

        it("shouldn't create a bet with status cashed_out without a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, status: BetStatus.CASHED_OUT })
                ).rejects.toThrow(
                    'Aposta do tipo cashout necessita de valor de pagamento'
                )
            })
        })

        it("shouldn't create a bet with status half_won without a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, status: BetStatus.HALF_WON })
                ).rejects.toThrow(
                    'Aposta do tipo meio ganha necessita de valor de pagamento'
                )
            })
        })

        it("shouldn't create a bet with status half_lost without a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.create({ ...NEW_BET, status: BetStatus.HALF_LOST })
                ).rejects.toThrow(
                    'Aposta do tipo meio perdida necessita de valor de pagamento'
                )
            })
        })

        it('should keep the refund as bonus when a bonus-staked bet is voided', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                // Sem isso, não existe saldo de bônus disponível pra apostar.
                await tx.balanceMovement.create({
                    data: {
                        type: 'BONUS_CREDIT',
                        amount: 50,
                        date: new Date('2026-09-01'),
                        bookmakerId: BET365_ID
                    }
                })

                const result = await service.create({
                    ...NEW_BET,
                    bookmakerId: BET365_ID,
                    stakeIsBonus: true,
                    status: BetStatus.VOID
                })

                expect(Number(result.payout)).toBe(Number(result.stake))
                expect(result.payoutIsBonus).toBe(true)
            })
        })
    })

    describe('update', () => {
        it('should update the stake and odd of a pending bet', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.update({
                    id: EXISTENT_BET,
                    stake: new Decimal(15),
                    odd: new Decimal(4.2)
                })

                expect(Number(result.stake)).toBe(15)
                expect(Number(result.odd)).toBe(4.2)
            })
        })

        it('should update only the informed fields, keeping the others unchanged', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.update({
                    id: EXISTENT_BET,
                    observation: 'Atualizado após revisão'
                })

                expect(result.observation).toBe('Atualizado após revisão')
                expect(result.status).toBe('PENDING')
                expect(Number(result.stake)).toBe(20)
            })
        })

        it('should resolve a pending bet to won, informing the payout', async () => {
            await withRollback(async tx => {
                const payout = new Decimal(78)
                const service = new BetService(tx)

                const result = await service.update({
                    id: EXISTENT_BET,
                    status: BetStatus.WON,
                    payout
                })

                expect(result.status).toBe('WON')
                expect(Number(result.payout)).toBe(78)
            })
        })

        it('should update a bet to status void, and payout is automatically set to the stake', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.update({
                    id: EXISTENT_BET,
                    status: BetStatus.VOID
                })

                expect(result.status).toBe('VOID')
                expect(Number(result.payout)).toBe(Number(result.stake))
            })
        })

        it("should add a tipster to a bet that didn't have one", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.update({
                    id: EXISTENT_BET,
                    tipsterId: PEI_ID
                })

                expect(result.tipsterId).toBe(PEI_ID)
            })
        })

        it("shouldn't update a bet that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({ id: INEXISTENT, observation: 'teste' })
                ).rejects.toThrow('Aposta não encontrada')
            })
        })

        it("shouldn't update a bet to a bookmaker that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        bookmakerId: INEXISTENT
                    })
                ).rejects.toThrow('Casa de aposta não encontrada')
            })
        })

        it("shouldn't update a bet to a tipster that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({ id: EXISTENT_BET, tipsterId: INEXISTENT })
                ).rejects.toThrow('bet_tipster_fkey (index)')
            })
        })

        it("shouldn't update a bet with a stake beyond the bookmaker's balance", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        stake: new Decimal(10000)
                    })
                ).rejects.toThrow('Saldo insuficiente para essa aposta')
            })
        })

        it("shouldn't update a bet with payout without an input status", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        payout: new Decimal(25)
                    })
                ).rejects.toThrow(
                    'O status da aposta não pode ser pendente quando possui retorno'
                )
            })
        })

        it("shouldn't update a bet with payout and status pending", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        payout: new Decimal(25),
                        status: BetStatus.PENDING
                    })
                ).rejects.toThrow(
                    'O status da aposta não pode ser pendente quando possui retorno'
                )
            })
        })

        it("shouldn't update a bet to status void informing a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        status: BetStatus.VOID,
                        payout: new Decimal(5)
                    })
                ).rejects.toThrow(
                    'Apostas anuladas não devem ter valor de pagamento informando pelo usuário'
                )
            })
        })

        it("shouldn't update a bet to status cashed_out without a payout", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(
                    service.update({
                        id: EXISTENT_BET,
                        status: BetStatus.CASHED_OUT
                    })
                ).rejects.toThrow(
                    'Aposta do tipo cashout necessita de valor de pagamento'
                )
            })
        })
    })

    describe('delete', () => {
        it('should delete an existing bet', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await service.delete(EXISTENT_BET)

                await expect(service.findById(EXISTENT_BET)).rejects.toThrow(
                    'Aposta não encontrada'
                )
            })
        })

        it("shouldn't delete a bet that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(service.delete(INEXISTENT)).rejects.toThrow(
                    'Aposta não encontrada'
                )
            })
        })

        it("shouldn't delete a bet dated in a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                // Criado direto no banco (bypass do service), simulando um
                // registro legado datado de julho — mês já fechado no seed.
                const legacyBet = await tx.bet.create({
                    data: {
                        description: 'Aposta antiga',
                        date: new Date('2026-07-10'),
                        stake: new Decimal(10),
                        bookmakerId: BET365_ID
                    }
                })

                await expect(service.delete(legacyBet.id)).rejects.toThrow(
                    'Não é possível lançar ou editar em um mês já fechado'
                )
            })
        })
    })

    describe('findById', () => {
        it('should find a bet by id', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.findById(EXISTENT_BET)

                expect(result.description).toBe('Fla x Flu: Chutes + Cartão')
            })
        })

        it("shouldn't find a bet that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                await expect(service.findById(INEXISTENT)).rejects.toThrow(
                    'Aposta não encontrada'
                )
            })
        })
    })

    describe('findAll', () => {
        it('should include the seeded bet when listing all bets', async () => {
            await withRollback(async tx => {
                const service = new BetService(tx)

                const result = await service.findAll()

                expect(result).toHaveLength(1)
                expect(result[0].description).toBe('Fla x Flu: Chutes + Cartão')
            })
        })
    })
})
