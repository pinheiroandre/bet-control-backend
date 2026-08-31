import { describe, it, expect, afterAll } from "vitest";
import { withRollback, prisma } from "../../test/withRollback";
import { loadTipsterFixture } from "../../test/fixtures";
import { TipsterService } from "../tipster";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("TipsterService (integration)", () => {
  describe("create", () => {
    it("should create a tipster with description", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);

        const result = await service.create({
          name: "Alessandra",
        });

        expect(result.id).toBeDefined();
        expect(result.name).toBe("Alessandra");
      });
    });

    it("shouldn't create a tipster without description", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);

        await expect(
          service.create({ name: "" })
        ).rejects.toThrow("Nome é obrigatório");
      });
    });

    it("shouldn't create a tipster with a description that already exists", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx); // inclui "Rica"

        await expect(
          service.create({
            name: 'Rica',
          })
        ).rejects.toThrow("Já existe um tipster com esse nome");
      });
    });

    it("shouldn't create a tipster with a description that already exists, regardless of case", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx); // inclui "Rica"

        await expect(
          service.create({ name: "RICA" })
        ).rejects.toThrow("Já existe um tipster com esse nome");
      });
    });
  });

  describe("update", () => {
    it("should update all fields of an existing tipster", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        const result = await service.update({
          id: 1,
          name: "Rica Real_Tips",
        });

        expect(result.name).toBe("Rica Real_Tips");
      });
    });

    it("shouldn't update a tipster that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);

        await expect(
          service.update({ id: 999999, name: "Chute inteligente" })
        ).rejects.toThrow("Tipster não encontrado");
      });
    });

    it("shouldn't update keeping the same name of another existing tipster", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        await expect(
          service.update({ id: 1, name: 'Pei' })
        ).rejects.toThrow("Já existe um tipster com esse nome");
      });
    });

    it("should update a tipster keeping its own current description unchanged", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        // Não deve acusar conflito "consigo mesma" — o filtro precisa
        // excluir o próprio id da checagem de duplicidade.
        const result = await service.update({
          id: 2,
          name: 'Pei',
        });

        expect(result.name).toBe("Pei");
      });
    });
  });

  describe("delete", () => {
    it("should delete an existing tipster", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        await service.delete(1);

        await expect(service.findById(1)).rejects.toThrow("Tipster não encontrado");
      });
    });

    it("shouldn't delete a tipster that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);

        await expect(service.delete(999999)).rejects.toThrow("Tipster não encontrado");
      });
    });
  });

  describe("findById", () => {
    it("should find a tipster by id", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        const result = await service.findById(1);

        expect(result.name).toBe('Rica');
      });
    });

    it("shouldn't find a tipster that doesn't exist", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);

        await expect(service.findById(999999)).rejects.toThrow("Tipster não encontrado");
      });
    });
  });

  describe("findAll", () => {
    it("should find all tipsters when no identifier is informed", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx); // Bet365 + Betano

        const result = await service.findAll();

        expect(result).toHaveLength(2);
      });
    });

    it("should find tipsters matching the identifier, regardless of position or case", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx); // Bet365 + Betano

        const result = await service.findAll({ identifier: "ica" });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Rica");
      });
    });

    it("should return an empty array when no tipster matches the identifier", async () => {
      await withRollback(async (tx) => {
        const service = new TipsterService(tx);
        await loadTipsterFixture(tx);

        const result = await service.findAll({ identifier: "inexistente" });

        expect(result).toEqual([]);
      });
    });
  });
});
