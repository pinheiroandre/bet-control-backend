import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export const prisma = new PrismaClient()

// "Sinal" interno usado só para forçar o rollback — nunca deve escapar
// para fora desta função.
class RollbackSignal extends Error {}

// Executa "fn" inteiramente dentro de uma transação do Postgres. Ao final,
// SEMPRE lançamos um erro proposital — isso faz o Prisma desfazer (rollback)
// tudo que foi escrito durante o teste, então nunca precisamos limpar a
// tabela manualmente entre um teste e outro.
//
// "fn" recebe "tx": um cliente Prisma válido só DENTRO dessa transação.
// É esse "tx" que deve ser injetado no service sendo testado, não o
// "prisma" normal — senão as escritas não fariam parte da transação.
export async function withRollback(
    fn: (tx: Prisma.TransactionClient) => Promise<void>
) {
    try {
        await prisma.$transaction(async tx => {
            await fn(tx)
            throw new RollbackSignal()
        })
    } catch (error) {
        if (!(error instanceof RollbackSignal)) {
            throw error
        }
    }
}
