import { describe, it, expect, afterAll } from "vitest";
import { withRollback, prisma } from "../../test/withRollback";
import { loadBookmakersFixture } from "../../test/fixtures";
import { BookmakerService } from "../bookmaker";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("BookmakerService (integration)", () => {
  describe("create", () => {
    it("should create a bookmaker with description, initialBalance and initialBalanceDate", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.create({
          description: "Bet365",
          initialBalance: 100,
          initialBalanceDate: new Date("2026-08-01"),
        });

        expect(result.id).toBeDefined();
        expect(result.description).toBe("Bet365");
        expect(Number(result.initialBalance)).toBe(100);
      });
    });

    it("should create a bookmaker with initialBalance zero when not informed", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        const result = await service.create({
          description: "Betano",
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
        await loadBookmakersFixture(tx); // inclui "Bet365"

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
        await loadBookmakersFixture(tx); // inclui "Bet365"

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
        const [bet365] = await loadBookmakersFixture(tx);

        console.log({ id: bet365.id})

        const result = await service.update({
          id: bet365.id,
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
        const [bet365] = await loadBookmakersFixture(tx);

        const result = await service.update({ id: bet365.id, initialBalance: 300 });

        expect(result.description).toBe(bet365.description); // não mudou
        expect(Number(result.initialBalance)).toBe(300);
      });
    });

    it("shouldn't update a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(
          service.update({ id: 999999, description: "Bet365" })
        ).rejects.toThrow("Casa de aposta não encontrada");
      });
    });

    it("shouldn't update keeping the same description of another existing bookmaker", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        const [bet365, betano] = await loadBookmakersFixture(tx);

        await expect(
          service.update({ id: betano.id, description: bet365.description })
        ).rejects.toThrow("Já existe uma casa de aposta com essa descrição");
      });
    });

    it("should update a bookmaker keeping its own current description unchanged", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        const [bet365] = await loadBookmakersFixture(tx);

        // Não deve acusar conflito "consigo mesma" — o filtro precisa
        // excluir o próprio id da checagem de duplicidade.
        const result = await service.update({
          id: bet365.id,
          description: bet365.description,
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
        const [bet365] = await loadBookmakersFixture(tx);

        await service.delete(bet365.id);

        await expect(service.findById(bet365.id)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });

    it("shouldn't delete a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(service.delete(999999)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });
  });

  describe("findById", () => {
    it("should find a bookmaker by id", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        const [bet365] = await loadBookmakersFixture(tx);

        const result = await service.findById(bet365.id);

        expect(result.description).toBe(bet365.description);
      });
    });

    it("shouldn't find a bookmaker that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);

        await expect(service.findById(999999)).rejects.toThrow("Casa de aposta não encontrada");
      });
    });
  });

  describe("findAll", () => {
    it("should find all bookmakers when no identifier is informed", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        await loadBookmakersFixture(tx); // Bet365 + Betano

        const result = await service.findAll();

        expect(result).toHaveLength(2);
      });
    });

    it("should find bookmakers matching the identifier, regardless of position or case", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        await loadBookmakersFixture(tx); // Bet365 + Betano

        const result = await service.findAll({ identifier: "ano" });

        expect(result).toHaveLength(1);
        expect(result[0].description).toBe("Betano");
      });
    });

    it("should return an empty array when no bookmaker matches the identifier", async () => {
      await withRollback(async (tx) => {
        const service = new BookmakerService(tx);
        await loadBookmakersFixture(tx);

        const result = await service.findAll({ identifier: "inexistente" });

        expect(result).toEqual([]);
      });
    });
  });
});
