import { describe, it, expect, afterAll } from "vitest";
import { withRollback, prisma } from "../../test/withRollback";
import { BookmakerService } from "../bookmaker";

afterAll(async () => {
  await prisma.$disconnect();
});

const ID_BET365 = "d91b64b7-a8c7-417e-bbbb-46e505cad17a"
const INEXISTENT = '3e1551df-ea30-4d3f-8ec5-f687a14795d7'

// Estes testes rodam contra o MESMO banco local usado em desenvolvimento —
// não existe mais um banco de teste separado. Isso só é seguro porque cada
// teste roda dentro de withRollback: tudo que ele criar/alterar/apagar é
// desfeito ao final, então o baseline populado por "yarn setup"
// (prisma/seed.ts, a partir de src/test/fixtures/bookmakers.json) nunca é
// corrompido de um teste para o outro.
describe("BookmakerService (integration)", () => {
  describe("create", () => {
    it("should create a bookmaker with description, initialBalance and initialBalanceDate", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.create({
          description: "Sportingbet",
          initialBalance: 100,
          initialBalanceDate: new Date("2026-08-01"),
        });

        expect(result.id).toBeDefined();
        expect(result.description).toBe("Sportingbet");
        expect(Number(result.initialBalance)).toBe(100);
      });
    });

    it("should create a bookmaker with initialBalance zero when not informed", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.create({
          description: "Sportingbet",
          initialBalanceDate: new Date("2026-08-01"),
        });

        expect(Number(result.initialBalance)).toBe(0);
      });
    });

    it("shouldn't create a bookmaker without description", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.create({ description: "", initialBalanceDate: new Date("2026-08-01") })
        ).rejects.toThrow("Descrição é obrigatória");
      });
    });

    it("shouldn't create a bookmaker with a description that already exists", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.create({
            description: 'Bet365',
            initialBalanceDate: new Date("2026-08-01"),
          })
        ).rejects.toThrow("Já existe uma casa de aposta com essa descrição");
      });
    });

    it("shouldn't create a bookmaker with a description that already exists, regardless of case", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.create({ description: "BET365", initialBalanceDate: new Date("2026-08-01") })
        ).rejects.toThrow("Já existe uma casa de aposta com essa descrição");
      });
    });
  });

  describe("update", () => {
    it("should update all fields of an existing bookmaker", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.update({
          id: ID_BET365,
          description: "Bet365 Renamed",
          initialBalance: 999,
        });

        expect(result.description).toBe("Bet365 Renamed");
        expect(Number(result.initialBalance)).toBe(999);
      });
    });

    it("should update only the informed fields, keeping the others unchanged", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.update({ id: ID_BET365, initialBalance: 300 });

        expect(result.description).toBe("Bet365"); // não mudou
        expect(Number(result.initialBalance)).toBe(300);
      });
    });

    it("shouldn't update a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.update({ id: INEXISTENT, description: "Bet365" })
        ).rejects.toThrow("Casa de aposta não encontrada");
      });
    });

    it("shouldn't update keeping the same description of another existing bookmaker", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.update({ id: ID_BET365, description: "Betano" })
        ).rejects.toThrow("Já existe uma casa de aposta com essa descrição");
      });
    });

    it("should update a bookmaker keeping its own current description unchanged", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        // Não deve acusar conflito "consigo mesma" — o filtro precisa
        // excluir o próprio id da checagem de duplicidade.
        const result = await service.update({
          id: ID_BET365,
          description: "Bet365",
          initialBalance: 50,
        });

        expect(Number(result.initialBalance)).toBe(50);
      });
    });
  });

  describe("delete", () => {
    it("should delete an existing bookmaker", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await service.delete(ID_BET365);

        await expect(service.findById(ID_BET365)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });

    it("shouldn't delete a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(service.delete(INEXISTENT)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });
  });

  describe("findById", () => {
    it("should find a bookmaker by id", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.findById(ID_BET365);

        expect(result.description).toBe("Bet365");
      });
    });

    it("shouldn't find a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(service.findById(INEXISTENT)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });
  });

  describe("findAll", () => {
    it("should include the seeded bookmakers when no identifier is informed", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.findAll();
        const descriptions = result.map((bookmaker) => bookmaker.description);

        expect(result).toHaveLength(2);
      });
    });

    it("should find bookmakers matching the identifier, regardless of position or case", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.findAll({ identifier: "ano" });

        expect(result).toHaveLength(1);
        expect(result[0].description).toBe("Betano");
      });
    });

    it("should return an empty array when no bookmaker matches the identifier", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.findAll({ identifier: "inexistente" });

        expect(result).toEqual([]);
      });
    });
  });
});
