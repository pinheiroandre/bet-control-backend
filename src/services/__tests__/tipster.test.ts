import { Decimal } from '@prisma/client/runtime/library'
import { describe, it, expect, afterAll } from 'vitest'
import { withRollback, prisma } from '../../test/withRollback'
import { TipsterService } from '../tipster'

afterAll(async () => {
    await prisma.$disconnect()
})

const RICA_ID = '3249daf5-2872-4d5a-a4ec-bf0e1af58671'
const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'

describe('TipsterService (integration)', () => {
    describe('create', () => {
        it('should create a tipster with description', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.create({
                    name: 'Alessandra'
                })

                expect(result.id).toBeDefined()
                expect(result.name).toBe('Alessandra')
            })
        })

        it("shouldn't create a tipster without description", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(service.create({ name: '' })).rejects.toThrow(
                    'Nome é obrigatório'
                )
            })
        })

        it("shouldn't create a tipster with a description that already exists", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(
                    service.create({
                        name: 'Rica'
                    })
                ).rejects.toThrow('Já existe um tipster com esse nome')
            })
        })

        it("shouldn't create a tipster with a description that already exists, regardless of case", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(service.create({ name: 'RICA' })).rejects.toThrow(
                    'Já existe um tipster com esse nome'
                )
            })
        })
    })

    describe('update', () => {
        it('should update all fields of an existing tipster', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.update({
                    id: RICA_ID,
                    name: 'Rica Real_Tips'
                })

                expect(result.name).toBe('Rica Real_Tips')
            })
        })

        it("shouldn't update a tipster that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(
                    service.update({
                        id: INEXISTENT,
                        name: 'Chute inteligente'
                    })
                ).rejects.toThrow('Tipster não encontrado')
            })
        })

        it("shouldn't update keeping the same name of another existing tipster", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(
                    service.update({ id: RICA_ID, name: 'Pei' })
                ).rejects.toThrow('Já existe um tipster com esse nome')
            })
        })

        it('should update a tipster keeping its own current description unchanged', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.update({
                    id: '2e40023f-cdb5-4378-89e2-5c8750c298b1',
                    name: 'Pei'
                })

                expect(result.name).toBe('Pei')
            })
        })
    })

    describe('delete', () => {
        it('should delete an existing tipster', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await service.delete(RICA_ID)

                await expect(service.findById(RICA_ID)).rejects.toThrow(
                    'Tipster não encontrado'
                )
            })
        })

        it("shouldn't delete a tipster that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(service.delete(INEXISTENT)).rejects.toThrow(
                    'Tipster não encontrado'
                )
            })
        })

        it("shouldn't delete a tipster that already has bets linked", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)
                const pei = await tx.tipster.findFirstOrThrow({
                    where: { name: 'Pei' }
                })

                await tx.bet.create({
                    data: {
                        description: 'Aposta indicada',
                        date: new Date('2026-09-05'),
                        stake: new Decimal(10),
                        bookmakerId: 'd91b64b7-a8c7-417e-bbbb-46e505cad17a',
                        tipsterId: pei.id
                    }
                })

                await expect(service.delete(pei.id)).rejects.toThrow(
                    'Não é possível excluir um tipster que já possui apostas vinculadas'
                )
            })
        })
    })

    describe('findById', () => {
        it('should find a tipster by id', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.findById(RICA_ID)

                expect(result.name).toBe('Rica')
            })
        })

        it("shouldn't find a tipster that doesn't exist", async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                await expect(service.findById(INEXISTENT)).rejects.toThrow(
                    'Tipster não encontrado'
                )
            })
        })
    })

    describe('findAll', () => {
        it('should find all tipsters when no identifier is informed', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.findAll()

                expect(result).toHaveLength(2)
            })
        })

        it('should find tipsters matching the identifier, regardless of position or case', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.findAll({ identifier: 'ica' })

                expect(result).toHaveLength(1)
                expect(result[0].name).toBe('Rica')
            })
        })

        it('should return an empty array when no tipster matches the identifier', async () => {
            await withRollback(async tx => {
                const service = new TipsterService(tx)

                const result = await service.findAll({
                    identifier: 'inexistente'
                })

                expect(result).toEqual([])
            })
        })
    })
})
