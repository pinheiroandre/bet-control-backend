import { PrismaClient } from "@prisma/client";
import { BookmakerService } from "./bookmaker";
// À medida que novos serviços forem criados (ex: BetService), o import
// e a instanciação deles entram aqui, e em nenhum outro lugar.

// Uma única instância do PrismaClient para toda a aplicação. Compartilhada
// entre todos os serviços — evita abrir uma conexão nova por serviço.
const prisma = new PrismaClient();

// Aqui "montamos" cada serviço, injetando o que ele precisar (hoje, só o
// prisma; no futuro, um serviço pode depender de outro serviço também).
export const container = {
  bookmakerService: new BookmakerService(prisma),
};
