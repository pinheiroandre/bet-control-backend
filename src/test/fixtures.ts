import { Prisma } from "@prisma/client";
import bookmakersFixture from "./fixtures/bookmakers.json";
import tipstersFixture from "./fixtures/tipster.json";

// Insere os registros do arquivo JSON usando o cliente da TRANSAÇÃO atual
// (não o Prisma "normal") — assim, tudo que a fixture cria também é
// desfeito no rollback ao final do teste, junto com o resto.
//
// Retorna os registros já criados (com id real), na mesma ordem do JSON,
// para os testes referenciarem por posição: const [bet365, betano] = ...
export async function loadBookmakersFixture(tx: Prisma.TransactionClient) {
  const created = [];

  for (const item of bookmakersFixture) {
    created.push(
      await tx.bookmaker.create({
        data: {
          id: item.id,
          description: item.description,
          initialBalance: item.initialBalance,
          initialBalanceDate: new Date(item.initialBalanceDate),
        },
      })
    );
  }

  return created;
}

export async function loadTipsterFixture(tx: Prisma.TransactionClient) {
  const created = [];

  for (const item of tipstersFixture) {
    created.push(
      await tx.tipster.create({
        data: {
          id: item.id,
          name: item.name,
        },
      })
    );
  }

  return created;
}
