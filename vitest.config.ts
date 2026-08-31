import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node" porque este é um backend — não precisamos simular um navegador (jsdom).
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Testes de integração compartilham o mesmo banco de teste — rodar em
    // paralelo poderia fazer um teste apagar dados que outro ainda está usando.
    fileParallelism: false,
  },
});
