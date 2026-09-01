import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node" porque este é um backend — não precisamos simular um navegador (jsdom).
    environment: "node",
    globals: true,
    // Todos os testes rodam contra o mesmo banco local (não há mais banco
    // de teste separado) — mantemos serial para evitar que transações de
    // arquivos de teste diferentes se cruzem de forma confusa.
    fileParallelism: false,
  },
});
