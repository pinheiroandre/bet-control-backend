import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // "node" porque este é um backend — não precisamos simular um navegador (jsdom).
    environment: "node",
    globals: true,
  },
});
