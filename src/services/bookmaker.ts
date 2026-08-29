import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";

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

export class BookmakerService {
  private repository: PrismaClient["bookmaker"];

  constructor(private prisma: PrismaClient) {
    this.repository = this.prisma.bookmaker;
  }

  // Auxliar functions
  validateRequired(input: CreateBookmakerInput) {
    if (!input.description || input.description.trim() === "") {
      throw new Error("Descrição é obrigatória");
    }

    if (!input.initialBalanceDate) {
      throw new Error("Data do saldo inicial é obrigatória");
    }
  }

  // Default services
  async create(input: CreateBookmakerInput) {

    this.validateRequired(input)

    return this.repository.create({
      data: {
        description: input.description,
        initialBalance: input.initialBalance ?? 0,
        initialBalanceDate: input.initialBalanceDate
      },
    });
  }

  async update(input:UpdateBookmakerInput) {
    const existendBookmaker = await this.findById(input.id)

    const toUpdated = {...existendBookmaker, ...input }

    this.validateRequired(toUpdated)

    return this.repository.update({
      where: { id: input.id },
      data: {
        description: input.description,
        initialBalance: input.initialBalance,
        initialBalanceDate: input.initialBalanceDate,
      },
    })
  }

  async delete(id: number) {
    await this.findById(id)

    return this.repository.delete({ where: { id }})

  }

  async findById(id: number) {
    const bookmaker = await this.repository
      .findUnique({ where: { id } })

    if (!bookmaker) {
      throw new Error("Casa de aposta não encontrada")
    }

    return bookmaker
  }

  async findAll(params: {identifier?: string} ) {
    return this.repository.findMany({
      where: params?.identifier
        ? { description: { contains: params.identifier, mode: "insensitive" } }
        : {},
    });
  }

}
