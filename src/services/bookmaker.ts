import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";
import { TYPES } from "../di/types";

interface CreateBookmakerInput {
  description: string;
  initialBalanceDate: Date;
  initialBalance?: number | Decimal;
}

interface UpdateBookmakerInput {
  id: number;
  description?: string;
  initialBalanceDate?: Date;
  initialBalance?: number | Decimal;
}

// @injectable() diz ao tsyringe "esta classe pode ser criada automaticamente
// pelo container". @inject(TYPES.PrismaClient) diz qual dependência
// específica entregar no parâmetro do construtor.
//
// Importante: nada impede de continuar instanciando na mão também
// (new BookmakerService(prismaMock)), como já fazemos nos testes — os
// decorators não obrigam o uso do container.
@injectable()
export class BookmakerService {
  private repository: PrismaClient["bookmaker"];

  constructor(@inject(TYPES.PrismaClient) private prisma: PrismaClient) {
    this.repository = this.prisma.bookmaker;
  }

  // Auxiliar functions
  private validateRequired(input: CreateBookmakerInput) {
    if (!input.description || input.description.trim() === "") {
      throw new Error("Descrição é obrigatória");
    }

    if (!input.initialBalanceDate) {
      throw new Error("Data do saldo inicial é obrigatória");
    }
  }

  // Default services
  async create(input: CreateBookmakerInput) {

    this.validateRequired(input);

    return this.repository.create({
      data: {
        description: input.description,
        initialBalance: input.initialBalance ?? 0,
        initialBalanceDate: input.initialBalanceDate,
      },
    });
  }

  async update(input: UpdateBookmakerInput) {
    const existendBookmaker = await this.findById(input.id)

    const toUpdated = { ...existendBookmaker, ...input };

    this.validateRequired(toUpdated);

    return this.repository.update({
      where: { id: input.id },
      data: {
        description: input.description,
        initialBalance: input.initialBalance,
        initialBalanceDate: input.initialBalanceDate,
      },
    });
  }

  async delete(id: number) {
    const existendBookmaker = await this.findById(id)

    return this.repository.delete({ where: { id } });
  }

  async findById(id: number) {
    const bookmaker = await this.repository.findUnique({
      where: { id },
    });

    if (!bookmaker) {
      throw new Error("Casa de aposta não encontrada");
    }

    return bookmaker;
  }

  // Busca todas as bookmakers. Se "identifier" for informado, filtra pela
  // description usando LIKE (contains) case-insensitive — ex: "ano" encontra
  // "Betano", em qualquer posição do texto e independente de maiúsculas.
  async findAll(params?: { identifier?: string }) {
    return this.repository.findMany({
      where: params?.identifier
        ? { description: { contains: params.identifier, mode: "insensitive" } }
        : {},
    });
  }
}
