import { PrismaClient } from "@prisma/client";

// Instanciamos o PrismaClient uma única vez e reutilizamos em toda a aplicação.
// Criar uma nova instância a cada requisição esgotaria as conexões do banco.
export const prisma = new PrismaClient();
