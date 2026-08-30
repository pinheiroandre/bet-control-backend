import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { TYPES } from "./types";
import { BookmakerService } from "../services/bookmaker";

// Uma única instância de PrismaClient para toda a aplicação.
const prisma = new PrismaClient();
container.register(TYPES.PrismaClient, { useValue: prisma });

// Registramos a classe (não uma instância pronta) — o tsyringe cria a
// instância sozinho quando alguém pedir TYPES.BookmakerService, injetando
// automaticamente o que o construtor de BookmakerService pedir (o Prisma
// registrado acima).
container.register(TYPES.BookmakerService, { useClass: BookmakerService });

export { container };
