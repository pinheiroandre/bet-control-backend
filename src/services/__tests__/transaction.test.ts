import { TransactionType } from '@prisma/client'
import { describe, it, expect, afterAll } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { TransactionService } from '../transaction'

afterAll(async () => {
    await prisma.$disconnect()
})

const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'
const ID_BET365 = 'd91b64b7-a8c7-417e-bbbb-46e505cad17a'

// Julho/2026 já está fechado no seed — usamos datas de setembro/2026 (mês
// aberto) para os casos de sucesso, e datas de julho para testar a trava
// de mês fechado.
describe('TransactionService (integration)', () => {
    describe('create', () => {
        it('should create a deposit', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const result = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                expect(result.id).toBeDefined()
                expect(result.type).toBe(TransactionType.DEPOSIT)
                expect(Number(result.amount)).toBe(50)
            })
        })

        it('should create a withdrawal within the available balance', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const result = await service.create({
                    type: TransactionType.WITHDRAWAL,
                    amount: 30,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                expect(result.type).toBe(TransactionType.WITHDRAWAL)
                expect(Number(result.amount)).toBe(30)
            })
        })

        it('should create a bonus credit', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const result = await service.create({
                    type: TransactionType.BONUS_CREDIT,
                    amount: 20,
                    date: new Date('2026-09-05'),
                    description: 'Cortesia por evento cancelado',
                    bookmakerId: ID_BET365
                })

                expect(result.type).toBe(TransactionType.BONUS_CREDIT)
                expect(result.description).toBe('Cortesia por evento cancelado')
            })
        })

        it("shouldn't create a transaction for a bookmaker that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(
                    service.create({
                        type: TransactionType.DEPOSIT,
                        amount: 50,
                        date: new Date('2026-09-05'),
                        bookmakerId: INEXISTENT
                    })
                ).rejects.toThrow('Casa de aposta não encontrada')
            })
        })

        it("shouldn't create a transaction with an amount of zero or less", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(
                    service.create({
                        type: TransactionType.DEPOSIT,
                        amount: 0,
                        date: new Date('2026-09-05'),
                        bookmakerId: ID_BET365
                    })
                ).rejects.toThrow('Valor da transação deve ser maior que zero')
            })
        })

        it("shouldn't create a transaction dated in a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(
                    service.create({
                        type: TransactionType.DEPOSIT,
                        amount: 50,
                        date: new Date('2026-07-15'),
                        bookmakerId: ID_BET365
                    })
                ).rejects.toThrow(
                    'Não é possível lançar ou editar em um mês já fechado'
                )
            })
        })

        it("shouldn't create a withdrawal beyond the available balance", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(
                    service.create({
                        type: TransactionType.WITHDRAWAL,
                        amount: 150,
                        date: new Date('2026-09-05'),
                        bookmakerId: ID_BET365
                    })
                ).rejects.toThrow('Saldo insuficiente para esse saque')
            })
        })
    })

    describe('update', () => {
        it('should update the amount and description of an existing transaction', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                const result = await service.update({
                    id: created.id,
                    amount: 80,
                    description: 'Depósito ajustado'
                })

                expect(Number(result.amount)).toBe(80)
                expect(result.description).toBe('Depósito ajustado')
            })
        })

        it("shouldn't update a transaction that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(
                    service.update({ id: INEXISTENT, amount: 10 })
                ).rejects.toThrow('Transação não encontrada')
            })
        })

        it("shouldn't update a transaction to a date in a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                await expect(
                    service.update({
                        id: created.id,
                        date: new Date('2026-07-10')
                    })
                ).rejects.toThrow(
                    'Não é possível lançar ou editar em um mês já fechado'
                )
            })
        })

        it("shouldn't update a withdrawal beyond the available balance", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.WITHDRAWAL,
                    amount: 30,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                await expect(
                    service.update({ id: created.id, amount: 500 })
                ).rejects.toThrow('Saldo insuficiente para esse saque')
            })
        })
    })

    describe('delete', () => {
        it('should delete an existing transaction', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                await service.delete(created.id)

                await expect(service.findById(created.id)).rejects.toThrow(
                    'Transação não encontrada'
                )
            })
        })

        it("shouldn't delete a transaction that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(service.delete(INEXISTENT)).rejects.toThrow(
                    'Transação não encontrada'
                )
            })
        })

        it("shouldn't delete a transaction dated in a month that is already closed", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const legacyTransaction = await tx.transaction.create({
                    data: {
                        type: TransactionType.DEPOSIT,
                        amount: 50,
                        date: new Date('2026-07-10'),
                        bookmakerId: ID_BET365
                    }
                })

                await expect(
                    service.delete(legacyTransaction.id)
                ).rejects.toThrow(
                    'Não é possível lançar ou editar em um mês já fechado'
                )
            })
        })
    })

    describe('findById', () => {
        it('should find a transaction by id', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                const result = await service.findById(created.id)

                expect(result.bookmakerId).toBe(ID_BET365)
            })
        })

        it("shouldn't find a transaction that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await expect(service.findById(INEXISTENT)).rejects.toThrow(
                    'Transação não encontrada'
                )
            })
        })
    })

    describe('findAll', () => {
        it('should filter by bookmakerId', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })
                await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 70,
                    date: new Date('2026-09-05'),
                    bookmakerId: '0a84b9d7-cf33-4c2e-bf19-cd8400fea6b7'
                })

                const result = await service.findAll({ bookmakerId: ID_BET365 })

                expect(result).toHaveLength(1)
                expect(result[0].bookmakerId).toBe(ID_BET365)
            })
        })

        it('should filter by type', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })
                await service.create({
                    type: TransactionType.BONUS_CREDIT,
                    amount: 20,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                const result = await service.findAll({
                    type: TransactionType.BONUS_CREDIT
                })
                const types = result.map(transaction => transaction.type)

                expect(
                    types.every(type => type === TransactionType.BONUS_CREDIT)
                ).toBe(true)
            })
        })

        it('should return all transactions when no filter is informed', async () => {
            await withRollback(async tx => {
                const service = new TransactionService(tx)

                const created = await service.create({
                    type: TransactionType.DEPOSIT,
                    amount: 50,
                    date: new Date('2026-09-05'),
                    bookmakerId: ID_BET365
                })

                const result = await service.findAll()
                const ids = result.map(transaction => transaction.id)

                expect(ids).toContain(created.id)
            })
        })
    })
})
