import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookmakerService } from "../bookmaker";

// With dependency injection, we no longer mock the whole Prisma module.
// Instead, we build a fake Prisma client and inject it directly into the
// service's constructor — the service doesn't know (or care) whether it's
// talking to the real Prisma or this fake one.
function createPrismaMock() {
  return {
    bookmaker: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

describe("BookmakerService", () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: BookmakerService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new BookmakerService(prismaMock as any);
  });

  describe("create", () => {
    it("should create a bookmaker with description, initialBalance and initialBalanceDate", async () => {
      const input = {
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
      };
      const expectedValues = { id: 1, ...input, createdAt: new Date(), updatedAt: new Date() };

      prismaMock.bookmaker.create.mockResolvedValue(expectedValues);

      const result = await service.create(input);

      expect(prismaMock.bookmaker.create).toHaveBeenCalledWith({
        data: {
          description: "Bet365",
          initialBalance: 100,
          initialBalanceDate: new Date("2026-08-01"),
        },
      });
      expect(result).toEqual(expectedValues);
    });

    it("should create a bookmaker with initialBalance zero when not informed", async () => {
      const input = { description: "Betano", initialBalanceDate: new Date("2026-08-01") };
      const expectedValues = {
        id: 2,
        description: "Betano",
        initialBalance: 0,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bookmaker.create.mockResolvedValue(expectedValues);

      const result = await service.create(input);

      expect(prismaMock.bookmaker.create).toHaveBeenCalledWith({
        data: {
          description: "Betano",
          initialBalance: 0,
          initialBalanceDate: new Date("2026-08-01"),
        },
      });
      expect(result).toEqual(expectedValues);
    });

    it("shouldn't create a bookmaker without description", async () => {
      await expect(
        service.create({ description: "", initialBalanceDate: new Date("2026-08-01") })
      ).rejects.toThrow("Descrição é obrigatória");
    });

    it("shouldn't create a bookmaker without initialBalanceDate", async () => {
      await expect(
        service.create({ description: "Bet365", initialBalanceDate: undefined as any })
      ).rejects.toThrow("Data do saldo inicial é obrigatória");
    });
  });

  describe("update", () => {
    it("should update all fields of an existing bookmaker", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input = {
        id: 1,
        description: "Bet365 Renamed",
        initialBalance: 200,
        initialBalanceDate: new Date("2026-08-05"),
      };
      const expectedValues = { ...existingRecord, ...input };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);
      prismaMock.bookmaker.update.mockResolvedValue(expectedValues);

      const result = await service.update(input);

      expect(prismaMock.bookmaker.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prismaMock.bookmaker.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          description: "Bet365 Renamed",
          initialBalance: 200,
          initialBalanceDate: new Date("2026-08-05"),
        },
      });
      expect(result).toEqual(expectedValues);
    });

    it("should update only the informed fields, keeping the others unchanged", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const input = { id: 1, initialBalance: 300 };
      const expectedValues = { ...existingRecord, initialBalance: 300 };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);
      prismaMock.bookmaker.update.mockResolvedValue(expectedValues);

      const result = await service.update(input);

      expect(prismaMock.bookmaker.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { initialBalance: 300 },
      });
      expect(result).toEqual(expectedValues);
    });

    it("shouldn't update a bookmaker that doesn't exist", async () => {
      prismaMock.bookmaker.findUnique.mockResolvedValue(null);

      await expect(service.update({ id: 999, description: "Bet365" })).rejects.toThrow(
        "Casa de aposta não encontrada"
      );

      expect(prismaMock.bookmaker.update).not.toHaveBeenCalled();
    });

    it("shouldn't update a bookmaker with an empty description", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);

      await expect(service.update({ id: 1, description: "" })).rejects.toThrow(
        "Descrição é obrigatória"
      );

      expect(prismaMock.bookmaker.update).not.toHaveBeenCalled();
    });

    it("shouldn't update a bookmaker with a null initialBalanceDate", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);

      await expect(
        service.update({ id: 1, initialBalanceDate: null as any })
      ).rejects.toThrow("Data do saldo inicial é obrigatória");

      expect(prismaMock.bookmaker.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete an existing bookmaker", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);
      prismaMock.bookmaker.delete.mockResolvedValue(existingRecord);

      const result = await service.delete(1);

      expect(prismaMock.bookmaker.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prismaMock.bookmaker.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(existingRecord);
    });

    it("shouldn't delete a bookmaker that doesn't exist", async () => {
      prismaMock.bookmaker.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow("Casa de aposta não encontrada");

      expect(prismaMock.bookmaker.delete).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("should find a bookmaker by id", async () => {
      const existingRecord = {
        id: 1,
        description: "Bet365",
        initialBalance: 100,
        initialBalanceDate: new Date("2026-08-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bookmaker.findUnique.mockResolvedValue(existingRecord);

      const result = await service.findById(1);

      expect(prismaMock.bookmaker.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(existingRecord);
    });

    it("shouldn't find a bookmaker that doesn't exist", async () => {
      prismaMock.bookmaker.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow("Casa de aposta não encontrada");
    });
  });

  describe("findAll", () => {
    it("should find all bookmakers when no identifier is informed", async () => {
      const records = [
        { id: 1, description: "Bet365", initialBalance: 100, initialBalanceDate: new Date("2026-08-01"), createdAt: new Date(), updatedAt: new Date() },
        { id: 2, description: "Betano", initialBalance: 200, initialBalanceDate: new Date("2026-08-01"), createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaMock.bookmaker.findMany.mockResolvedValue(records);

      const result = await service.findAll({});

      expect(prismaMock.bookmaker.findMany).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual(records);
    });

    it("should find bookmakers matching the identifier, regardless of position or case", async () => {
      // "ano" should match "Betano" (LIKE %ano%, case-insensitive)
      const records = [
        { id: 2, description: "Betano", initialBalance: 200, initialBalanceDate: new Date("2026-08-01"), createdAt: new Date(), updatedAt: new Date() },
      ];

      prismaMock.bookmaker.findMany.mockResolvedValue(records);

      const result = await service.findAll({ identifier: "ano" });

      expect(prismaMock.bookmaker.findMany).toHaveBeenCalledWith({
        where: {
          description: { contains: "ano", mode: "insensitive" },
        },
      });
      expect(result).toEqual(records);
    });

    it("should return an empty array when no bookmaker matches the identifier", async () => {
      prismaMock.bookmaker.findMany.mockResolvedValue([]);

      const result = await service.findAll({ identifier: "inexistente" });

      expect(result).toEqual([]);
    });
  });
});